import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCache } from '../hooks/useCache';
import TestRunControl from './TestRun/TestRunControl';
import SystemStatusPanel from './TestRun/SystemStatusPanel';
// Status components moved to status view

interface TestRunViewProps {
  apiBase: string;
  selectedBlock: number;
}

interface ParameterSet {
  id: number;
  name: string;
  type: string;
  comment?: string;
}

interface TestRun {
  messID: number;
  testType: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  ventilkonfigurationId?: number;
  konfigurationLangzeittestId?: number;
  konfigurationDetailtestId?: number;
  comment?: string;
}

interface VentilConfig {
  number: number;
  enabled: boolean;
  comment: string;
  startCounterValue: number;
}

export default function TestRunView({ apiBase, selectedBlock }: TestRunViewProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { data, error, refresh } = useCache(apiBase, selectedBlock, autoRefresh, 2000);

  // Test Run State
  const [nextMessID, setNextMessID] = useState<number | null>(null);
  const [testType, setTestType] = useState<'Langzeittest' | 'Detailtest' | 'Einzeltest'>('Langzeittest');
  const [ventilParameterSets, setVentilParameterSets] = useState<ParameterSet[]>([]);
  const [langzeittestParameterSets, setLangzeittestParameterSets] = useState<ParameterSet[]>([]);
  const [detailtestParameterSets, setDetailtestParameterSets] = useState<ParameterSet[]>([]);
  const [komponentenParameterSets, setKomponentenParameterSets] = useState<ParameterSet[]>([]);
  
  const [selectedVentilConfig, setSelectedVentilConfig] = useState<number | null>(null);
  const [selectedLangzeitConfig, setSelectedLangzeitConfig] = useState<number | null>(null);
  const [selectedDetailConfig, setSelectedDetailConfig] = useState<number | null>(null);
  const [selectedKomponentenConfig, setSelectedKomponentenConfig] = useState<number | null>(null);

  // Editable parameter groups for selected datasets
  const [ventilGroups, setVentilGroups] = useState<Record<string, { name: string; value: string }[]>>({});
  const [ventilDirty, setVentilDirty] = useState(false);
  const [langzeitGroups, setLangzeitGroups] = useState<Record<string, { name: string; value: string }[]>>({});
  const [langzeitDirty, setLangzeitDirty] = useState(false);
  const [detailGroups, setDetailGroups] = useState<Record<string, { name: string; value: string }[]>>({});
  const [detailDirty, setDetailDirty] = useState(false);
  const [komponentenGroups, setKomponentenGroups] = useState<Record<string, { name: string; value: string }[]>>({});
  const [komponentenDirty, setKomponentenDirty] = useState(false);
  
  // Langzeittest live OPC UA values
  const [langzeitLiveValues, setLangzeitLiveValues] = useState<{
    anzahlGesamtSchlagzahlen: string | null;
    anzahlSchlagzahlenDetailtest: string | null;
  }>({
    anzahlGesamtSchlagzahlen: null,
    anzahlSchlagzahlenDetailtest: null
  });
  const [langzeitEditValues, setLangzeitEditValues] = useState<{
    anzahlGesamtSchlagzahlen: string;
    anzahlSchlagzahlenDetailtest: string;
  }>({
    anzahlGesamtSchlagzahlen: '',
    anzahlSchlagzahlenDetailtest: ''
  });
  const [langzeitLoading, setLangzeitLoading] = useState(false);
  
  const [testComment, setTestComment] = useState<string>('');
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [activeTestRun, setActiveTestRun] = useState<TestRun | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Helper function to format OPC UA values
  function formatValue(v: any): string {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'string') {
      try {
        const p = JSON.parse(v);
        if (Array.isArray(p)) return p.join(', ');
        if (typeof p === 'object') return JSON.stringify(p);
      } catch { }
      return v;
    }
    return String(v);
  }
  
  // Ventil configuration (16 valves)
  const [ventilConfigs, setVentilConfigs] = useState<VentilConfig[]>(
    Array.from({ length: 16 }, (_, i) => ({
      number: i + 1,
      enabled: true,
      comment: '',
      startCounterValue: 0
    }))
  );
  
  // System status from AllgemeineParameter
  const messMode = data?.allgemeineParameter?.messMode ?? null;
  const operationMode = data?.allgemeineParameter?.operationMode ?? null;

  const canStartTest = messMode === 0;
  
  const getMessModeText = (mode: number | null) => {
    if (mode === null) return 'Unbekannt';
    switch (mode) {
      case 0: return 'Keine Messung aktiv';
      case 1: return 'Langzeittest aktiv';
      case 2: return 'Detailtest aktiv';
      case 3: return 'Einzeltest aktiv';
      default: return `Unbekannt (${mode})`;
    }
  };
  
  const getOperationModeText = (mode: number | null) => {
    if (mode === null) return 'Unbekannt';
    switch (mode) {
      case 0: return 'Leerlauf (Bereit)';
      case 1: return 'Automatik Modus';
      case 2: return 'Manuell Modus';
      case 3: return 'Reset';
      default: return `Unbekannt (${mode})`;
    }
  };

  useEffect(() => {
    loadNextMessID();
    loadParameterSets();
    loadActiveTestRun();
  }, [selectedBlock]);

  useEffect(() => {
    const load = async () => {
      if (!selectedVentilConfig) { setVentilGroups({}); setVentilDirty(false); return; }
      try {
        const res = await axios.get(`${apiBase}/api/datasets/${selectedVentilConfig}`);
        const payload = res.data?.payload;
        const groups = parseDatasetToGroups(payload);
        const filtered: Record<string, { name: string; value: string }[]> = {};
        Object.entries(groups).forEach(([g, arr]) => {
          if (g.toLowerCase().includes('ventilkonfiguration')) filtered[g] = arr as any;
        });
        setVentilGroups(filtered);
        setVentilDirty(false);
      } catch (e) {
        console.error('Failed to load Ventilkonfiguration payload', e);
        setVentilGroups({});
        setVentilDirty(false);
      }
    };
    load();
  }, [selectedVentilConfig, apiBase]);

  useEffect(() => {
    const load = async () => {
      if (!selectedLangzeitConfig) { setLangzeitGroups({}); setLangzeitDirty(false); return; }
      try {
        const res = await axios.get(`${apiBase}/api/datasets/${selectedLangzeitConfig}`);
        const payload = res.data?.payload;
        const groups = parseDatasetToGroups(payload);
        const filtered: Record<string, { name: string; value: string }[]> = {};
        Object.entries(groups).forEach(([g, arr]) => {
          if (g.toLowerCase().includes('langzeittest')) filtered[g] = arr as any;
        });
        setLangzeitGroups(filtered);
        setLangzeitDirty(false);
      } catch (e) {
        console.error('Failed to load Langzeittest payload', e);
        setLangzeitGroups({});
        setLangzeitDirty(false);
      }
    };
    if (testType === 'Langzeittest') load(); else { setLangzeitGroups({}); setLangzeitDirty(false); }
  }, [selectedLangzeitConfig, apiBase, testType]);

  useEffect(() => {
    const load = async () => {
      if (!selectedDetailConfig) { setDetailGroups({}); setDetailDirty(false); return; }
      try {
        const res = await axios.get(`${apiBase}/api/datasets/${selectedDetailConfig}`);
        const payload = res.data?.payload;
        const groups = parseDatasetToGroups(payload);
        const filtered: Record<string, { name: string; value: string }[]> = {};
        Object.entries(groups).forEach(([g, arr]) => {
          if (g.toLowerCase().includes('detailtest')) filtered[g] = arr as any;
        });
        setDetailGroups(filtered);
        setDetailDirty(false);
      } catch (e) {
        console.error('Failed to load Detailtest payload', e);
        setDetailGroups({});
        setDetailDirty(false);
      }
    };
    if (testType === 'Detailtest') load(); else { setDetailGroups({}); setDetailDirty(false); }
  }, [selectedDetailConfig, apiBase, testType]);

  useEffect(() => {
    const load = async () => {
      if (!selectedKomponentenConfig) { setKomponentenGroups({}); setKomponentenDirty(false); return; }
      try {
        const res = await axios.get(`${apiBase}/api/datasets/${selectedKomponentenConfig}`);
        const payload = res.data?.payload;
        const groups = parseDatasetToGroups(payload);
        const filtered: Record<string, { name: string; value: string }[]> = {};
        Object.entries(groups).forEach(([g, arr]) => {
          if (g === 'Ventilkonfiguration/Sensor-Regler') filtered[g] = arr as any;
        });
        setKomponentenGroups(filtered);
        setKomponentenDirty(false);
      } catch (e) {
        console.error('Failed to load Komponenten payload', e);
        setKomponentenGroups({});
        setKomponentenDirty(false);
      }
    };
    load();
  }, [selectedKomponentenConfig, apiBase]);

  useEffect(() => {
    if (testType === 'Langzeittest') {
      loadLangzeitValues();
    }
  }, [testType, selectedBlock]);

  async function loadLangzeitValues() {
    setLangzeitLoading(true);
    try {
      const group = 'AllgemeineParameter';
      const gesamtRes = await axios.get(
        `${apiBase}/api/parameters/${selectedBlock}/value?group=${encodeURIComponent(group)}&name=${encodeURIComponent('AnzahlGesamtSchlagzahlen')}`
      );
      const gesamtVal = formatValue(gesamtRes.data?.value);
      const detailRes = await axios.get(
        `${apiBase}/api/parameters/${selectedBlock}/value?group=${encodeURIComponent(group)}&name=${encodeURIComponent('AnzahlSchlagzahlenDetailtest')}`
      );
      const detailVal = formatValue(detailRes.data?.value);
      setLangzeitLiveValues({
        anzahlGesamtSchlagzahlen: gesamtVal || null,
        anzahlSchlagzahlenDetailtest: detailVal || null
      });
      setLangzeitEditValues({
        anzahlGesamtSchlagzahlen: gesamtVal || '',
        anzahlSchlagzahlenDetailtest: detailVal || ''
      });
    } catch (e) {
      console.error('Failed to load Langzeittest values:', e);
      setLangzeitLiveValues({
        anzahlGesamtSchlagzahlen: null,
        anzahlSchlagzahlenDetailtest: null
      });
    } finally {
      setLangzeitLoading(false);
    }
  }

  async function writeLangzeitValue(paramName: string, value: string) {
    try {
      const group = 'AllgemeineParameter';
      await axios.post(
        `${apiBase}/api/parameters/${selectedBlock}/value?group=${encodeURIComponent(group)}&name=${encodeURIComponent(paramName)}`,
        { value: value }
      );
      setStatusMessage(`${paramName} erfolgreich geschrieben`);
      await loadLangzeitValues();
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (e: any) {
      setStatusMessage(`Fehler beim Schreiben von ${paramName}: ${e.message}`);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  }

  async function loadNextMessID() {
    try {
      const res = await axios.get(`${apiBase}/api/testruns/next-messid`);
      setNextMessID(res.data);
    } catch (error) {
      console.error('Failed to load next MessID:', error);
    }
  }

  async function loadParameterSets() {
    try {
      const res = await axios.get(`${apiBase}/api/datasets`, {
        params: { blockIndex: selectedBlock }
      });
      const sets = res.data || [];
      setVentilParameterSets(sets.filter((s: ParameterSet) => s.type === 'VentilAnsteuerparameter'));
      setLangzeittestParameterSets(sets.filter((s: ParameterSet) => s.type === 'VentilLangzeittestparameter'));
      setDetailtestParameterSets(sets.filter((s: ParameterSet) => s.type === 'VentilDetailtestparameter'));
      setKomponentenParameterSets(sets.filter((s: ParameterSet) => s.type === 'Komponenten'));
    } catch (error) {
      console.error('Failed to load parameter sets:', error);
    }
  }

  async function loadActiveTestRun() {
    try {
      const res = await axios.get(`${apiBase}/api/testruns/active`, {
        params: { blockIndex: selectedBlock }
      });
      setActiveTestRun(res.data);
    } catch (error) {
      setActiveTestRun(null);
    }
  }

  function parseDatasetToGroups(payloadJson?: string): Record<string, { name: string; value: string }[]> {
    if (!payloadJson) return {};
    try {
      const payload = JSON.parse(payloadJson);
      const groups: Record<string, { name: string; value: string }[]> = {};
      const g = payload.groups || {};
      Object.keys(g).forEach(k => {
        const arr = Array.isArray(g[k]) ? g[k] : [];
        groups[k] = arr.map((p: any) => ({ name: String(p.name), value: String(p.value ?? '') }));
      });
      return groups;
    } catch {
      return {};
    }
  }

  function buildPayloadFromGroups(groups: Record<string, { name: string; value: string }[]>): string {
    const payload = { groups: {} as any };
    Object.entries(groups).forEach(([k, arr]) => {
      payload.groups[k] = (arr || []).map(p => ({ name: p.name, value: p.value }));
    });
    return JSON.stringify(payload);
  }

  async function createDataset(name: string, type: string, blockIndex: number, jsonPayload: string, comment?: string): Promise<number> {
    const res = await axios.post(`${apiBase}/api/datasets`, { name, type, blockIndex, jsonPayload, comment });
    return res.data?.id ?? 0;
  }

  async function startTest() {
    if (!selectedVentilConfig) {
      alert('Bitte wählen Sie eine Ventilkonfiguration aus!');
      return;
    }
    if (!selectedKomponentenConfig) {
      alert('Bitte wählen Sie eine Komponenten-Konfiguration aus!');
      return;
    }
    if (testType === 'Langzeittest' && !selectedLangzeitConfig) {
      alert('Bitte wählen Sie eine Langzeittest-Konfiguration aus!');
      return;
    }
    if (testType === 'Detailtest' && !selectedDetailConfig) {
      alert('Bitte wählen Sie eine Detailtest-Konfiguration aus!');
      return;
    }
    if (!canStartTest) {
      const currentTest = getMessModeText(messMode);
      alert(`Kann keinen Test starten!\n\nAktueller Status: ${currentTest}\n\nBitte stoppen Sie zuerst den laufenden Test.`);
      return;
    }

    setIsStartingTest(true);
    setStatusMessage('Test wird vorbereitet...');

    try {
      setStatusMessage('Lade Ventilkonfiguration...');
      let ventilPayloadJson: string | null = null;
      try {
        if (Object.keys(ventilGroups).length > 0) {
          ventilPayloadJson = buildPayloadFromGroups(ventilGroups);
          if (ventilDirty && nextMessID != null) {
            const newId = await createDataset(`Ventilkonfig_MessID_${nextMessID}`, 'VentilAnsteuerparameter', selectedBlock, ventilPayloadJson, testComment);
            setSelectedVentilConfig(newId);
          }
        } else {
          const ventilConfig = await axios.get(`${apiBase}/api/datasets/${selectedVentilConfig}`);
          ventilPayloadJson = ventilConfig.data?.payload;
        }
      } catch (e: any) {
        throw new Error(`Fehler beim Laden/Speichern der Ventilkonfiguration: ${e.message || e}`);
      }

      if (!ventilPayloadJson) throw new Error('Ventilkonfiguration hat kein Payload');
      await sendParametersToOPCUA(ventilPayloadJson, 'Ventilkonfiguration');
      await verifyParameters(ventilPayloadJson, 'Ventilkonfiguration');

      setStatusMessage('Lade Komponenten-Konfiguration...');
      let komponentenPayloadJson: string | null = null;
      try {
        if (Object.keys(komponentenGroups).length > 0) {
          komponentenPayloadJson = buildPayloadFromGroups(komponentenGroups);
          if (komponentenDirty && nextMessID != null) {
            const newId = await createDataset(`Komponenten_MessID_${nextMessID}`, 'Komponenten', selectedBlock, komponentenPayloadJson, testComment);
            setSelectedKomponentenConfig(newId);
          }
        } else {
          const komponentenConfig = await axios.get(`${apiBase}/api/datasets/${selectedKomponentenConfig}`);
          komponentenPayloadJson = komponentenConfig.data?.payload;
        }
      } catch (e: any) {
        throw new Error(`Fehler beim Laden/Speichern der Komponenten-Konfiguration: ${e.message || e}`);
      }

      if (!komponentenPayloadJson) throw new Error('Komponenten-Konfiguration hat kein Payload');
      await sendParametersToOPCUA(komponentenPayloadJson, 'Ventilkonfiguration Sensor-Regler');
      await verifyParameters(komponentenPayloadJson, 'Ventilkonfiguration Sensor-Regler');

      if (testType === 'Langzeittest' && selectedLangzeitConfig) {
        setStatusMessage('Lade Langzeittest-Konfiguration...');
        let lzPayloadJson: string | null = null;
        try {
          if (Object.keys(langzeitGroups).length > 0) {
            lzPayloadJson = buildPayloadFromGroups(langzeitGroups);
            if (langzeitDirty && nextMessID != null) {
              const newId = await createDataset(`Langzeittest_MessID_${nextMessID}`, 'VentilLangzeittestparameter', selectedBlock, lzPayloadJson, testComment);
              setSelectedLangzeitConfig(newId);
            }
          } else {
            const langzeitConfig = await axios.get(`${apiBase}/api/datasets/${selectedLangzeitConfig}`);
            lzPayloadJson = langzeitConfig.data?.payload;
          }
        } catch (e: any) {
          throw new Error(`Fehler beim Laden/Speichern der Langzeittest-Konfiguration: ${e.message || e}`);
        }
        if (!lzPayloadJson) throw new Error('Langzeittest-Konfiguration hat kein Payload');
        await sendParametersToOPCUA(lzPayloadJson, 'Konfiguration_Langzeittest');
        await verifyParameters(lzPayloadJson, 'Konfiguration_Langzeittest');
      } else if (testType === 'Detailtest' && selectedDetailConfig) {
        setStatusMessage('Lade Detailtest-Konfiguration...');
        let dtPayloadJson: string | null = null;
        try {
          if (Object.keys(detailGroups).length > 0) {
            dtPayloadJson = buildPayloadFromGroups(detailGroups);
            if (detailDirty && nextMessID != null) {
              const newId = await createDataset(`Detailtest_MessID_${nextMessID}`, 'VentilDetailtestparameter', selectedBlock, dtPayloadJson, testComment);
              setSelectedDetailConfig(newId);
            }
          } else {
            const detailConfig = await axios.get(`${apiBase}/api/datasets/${selectedDetailConfig}`);
            dtPayloadJson = detailConfig.data?.payload;
          }
        } catch (e: any) {
          throw new Error(`Fehler beim Laden/Speichern der Detailtest-Konfiguration: ${e.message || e}`);
        }
        if (!dtPayloadJson) throw new Error('Detailtest-Konfiguration hat kein Payload');
        await sendParametersToOPCUA(dtPayloadJson, 'Konfiguration_Detailtest');
        await verifyParameters(dtPayloadJson, 'Konfiguration_Detailtest');
      }

      setStatusMessage('Erstelle Prüflauf-Eintrag...');
      const additionalInfo = JSON.stringify({
        ventilConfigs: ventilConfigs.map(v => ({
          number: v.number,
          enabled: v.enabled,
          comment: v.comment,
          startCounterValue: v.startCounterValue
        }))
      });

      let testRunResponse;
      try {
        testRunResponse = await axios.post(`${apiBase}/api/testruns`, {
          testType: testType,
          blockIndex: selectedBlock,
          ventilkonfigurationId: selectedVentilConfig,
          konfigurationLangzeittestId: testType === 'Langzeittest' ? selectedLangzeitConfig : null,
          konfigurationDetailtestId: testType === 'Detailtest' ? selectedDetailConfig : null,
          comment: testComment || `${testType} - Block ${selectedBlock}`,
          additionalInfo: additionalInfo
        });
      } catch (error: any) {
        console.error('Failed to create TestRun:', error.response?.data);
        throw new Error(`Fehler beim Erstellen des Prüflaufs: ${error.response?.data?.message || error.message}`);
      }

      const newTestRun: TestRun = testRunResponse.data;
      setActiveTestRun(newTestRun);

      setStatusMessage('Setze aktiven Prüflauf...');
      try {
        await axios.post(`${apiBase}/api/measurementmonitoring/active-testrun`, {
          blockIndex: selectedBlock,
          messID: newTestRun.messID
        });
      } catch (error: any) {
        console.error('Failed to set active TestRun:', error.response?.data);
        throw new Error(`Fehler beim Setzen des aktiven Prüflaufs: ${error.response?.data?.message || error.message}`);
      }

      setStatusMessage('Starte Prüflauf...');
      try {
        await axios.post(`${apiBase}/api/testruns/${newTestRun.messID}/start`);
      } catch (error: any) {
        console.error('Failed to start TestRun:', error.response?.data);
        throw new Error(`Fehler beim Starten des Prüflaufs: ${error.response?.data?.message || error.message}`);
      }

      setStatusMessage('Setze VentilSperre Bitfeld...');
      try {
        await writeVentilSperreToOPCUA();
      } catch (error: any) {
        console.error('Failed to write VentilSperre to OPC UA:', error.response?.data);
        throw new Error(`Fehler beim Schreiben der VentilSperre: ${error.response?.data?.message || error.message}`);
      }

      setStatusMessage(`Setze MessID ${newTestRun.messID} im PLC...`);
      try {
        await writeMessIDToOPCUA(newTestRun.messID);
      } catch (error: any) {
        console.error('Failed to write MessID to OPC UA:', error.response?.data);
        throw new Error(`Fehler beim Schreiben der MessID: ${error.response?.data?.message || error.message}`);
      }

      try {
        await sendStartCommand();
      } catch (error: any) {
        console.error('Failed to send start command:', error.response?.data);
        throw new Error(`Fehler beim Senden des Start-Kommandos: ${error.response?.data?.message || error.message}`);
      }

      setStatusMessage('Warte auf Bestätigung vom PLC...');
      const expectedMessMode = testType === 'Langzeittest' ? 1 : testType === 'Detailtest' ? 2 : 3;
      const testStarted = await waitForMessModeChange(expectedMessMode, 30000);

      if (!testStarted) {
        await axios.post(`${apiBase}/api/testruns/${newTestRun.messID}/fail`);
        await axios.delete(`${apiBase}/api/measurementmonitoring/active-testrun`, { params: { blockIndex: selectedBlock } });
        setActiveTestRun(null);
        throw new Error('PLC hat den Test nicht gestartet. MessMode wurde nicht geändert.');
      }

      setStatusMessage(`Prüflauf ${newTestRun.messID} erfolgreich gestartet!`);
      await loadNextMessID();
      setTimeout(() => setStatusMessage(''), 5000);

    } catch (error: any) {
      console.error('Error starting test:', error);
      setStatusMessage(`Fehler beim Starten des Tests: ${error.message}`);
      alert(`Fehler beim Starten des Tests: ${error.message}`);
    } finally {
      setIsStartingTest(false);
    }
  }

  async function waitForMessModeChange(expectedMode: number, timeoutMs: number): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const startTime = Date.now();
    let intervalMs = 500;
    while (Date.now() - startTime < timeoutMs) {
      try {
        try {
          const response = await axios.get(`${apiBase}/api/cache/${selectedBlock}`);
          const freshData = response.data;
          const currentMessMode = freshData?.allgemeineParameter?.messMode;
          if (currentMessMode === expectedMode) {
            refresh();
            return true;
          }
        } catch (e) { }
        try {
          const grp = encodeURIComponent('AllgemeineParameter');
          const paramsResp = await axios.get(`${apiBase}/api/parameters/${selectedBlock}/group/${grp}`);
          const list = Array.isArray(paramsResp.data) ? paramsResp.data : [];
          const messModeParam = list.find((p: any) => (p?.name || '').toLowerCase() === 'messmode');
          const directMessMode = messModeParam != null ? Number(messModeParam.value) : undefined;
          if (directMessMode === expectedMode) {
            refresh();
            return true;
          }
        } catch (e) { }
      } catch (error) { }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      intervalMs = Math.min(2500, Math.round(intervalMs * 1.5));
    }
    return false;
  }

  async function sendParametersToOPCUA(payloadJson: string, groupName: string) {
    try {
      const payload = JSON.parse(payloadJson);
      const groups = payload.groups || {};
      for (const [gName, params] of Object.entries(groups)) {
        if (Array.isArray(params)) {
          for (const param of params as any[]) {
            try {
              await axios.post(
                `${apiBase}/api/parameters/${selectedBlock}/value?group=${encodeURIComponent(gName)}&name=${encodeURIComponent(param.name)}`,
                { value: String(param.value) }
              );
            } catch { }
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      throw new Error(`Fehler beim Senden der Parameter für ${groupName}: ${error.response?.data?.error || error.message}`);
    }
  }

  async function verifyParameters(payloadJson: string, groupName: string) {
    setStatusMessage(`Verifiziere ${groupName}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  async function sendStartCommand() {
    const commandMap: { [key: string]: string } = {
      'Langzeittest': 'Langzeittest_Start',
      'Detailtest': 'Detailtest_Start',
      'Einzeltest': 'Einzeltest_Start'
    };
    const command = commandMap[testType];
    if (!command) throw new Error(`Unbekannter Test-Typ: ${testType}`);
    await axios.post(`${apiBase}/api/parameters/${selectedBlock}/value?group=Kommandos&name=${encodeURIComponent(command)}`, { value: 'true' });
  }

  async function writeVentilSperreToOPCUA() {
    let ventilSperre = 0;
    for (let i = 0; i < 16; i++) {
      if (!ventilConfigs[i].enabled) {
        ventilSperre |= (1 << i);
      }
    }
    await axios.post(`${apiBase}/api/parameters/${selectedBlock}/value?group=AllgemeineParameter&name=${encodeURIComponent('VentilSperre')}`, { value: String(ventilSperre) });
  }

  async function writeMessIDToOPCUA(messID: number) {
    const messIDParamMap: { [key: string]: string } = {
      'Langzeittest': 'MessIDLongterm',
      'Detailtest': 'MessIDDetail',
      'Einzeltest': 'MessIDSingle'
    };
    const paramName = messIDParamMap[testType];
    if (!paramName) throw new Error(`Unbekannter Test-Typ für MessID: ${testType}`);
    await axios.post(`${apiBase}/api/parameters/${selectedBlock}/value?group=Kommandos&name=${encodeURIComponent(paramName)}`, { value: String(messID) });
  }

  async function stopTest() {
    if (!activeTestRun) return;
    try {
      let stopCommand = 'Stop';
      if (messMode === 1) stopCommand = 'Langzeittest_Stop';
      else if (messMode === 2) stopCommand = 'Detailtest_Stop';
      else if (messMode === 3) stopCommand = 'Einzeltest_Stop';
      await axios.post(`${apiBase}/api/parameters/${selectedBlock}/value?group=Kommandos&name=${stopCommand}`, { value: 'true' });
      await axios.post(`${apiBase}/api/testruns/${activeTestRun.messID}/complete`);
      await axios.delete(`${apiBase}/api/measurementmonitoring/active-testrun`, { params: { blockIndex: selectedBlock } });
      setActiveTestRun(null);
      setStatusMessage('Test gestoppt');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error: any) {
      alert(`Fehler beim Stoppen des Tests: ${error.message}`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
      <TestRunControl
        apiBase={apiBase}
        selectedBlock={selectedBlock}
        messMode={messMode}
        activeTestRun={activeTestRun}
        setActiveTestRun={setActiveTestRun}
        stopTest={stopTest}
        testType={testType}
        setTestType={setTestType}
        testComment={testComment}
        setTestComment={setTestComment}
        nextMessID={nextMessID}
        ventilParameterSets={ventilParameterSets}
        langzeittestParameterSets={langzeittestParameterSets}
        detailtestParameterSets={detailtestParameterSets}
        komponentenParameterSets={komponentenParameterSets}
        selectedVentilConfig={selectedVentilConfig}
        setSelectedVentilConfig={setSelectedVentilConfig}
        selectedLangzeitConfig={selectedLangzeitConfig}
        setSelectedLangzeitConfig={setSelectedLangzeitConfig}
        selectedDetailConfig={selectedDetailConfig}
        setSelectedDetailConfig={setSelectedDetailConfig}
        selectedKomponentenConfig={selectedKomponentenConfig}
        setSelectedKomponentenConfig={setSelectedKomponentenConfig}
        ventilGroups={ventilGroups}
        setVentilGroups={setVentilGroups}
        ventilDirty={ventilDirty}
        setVentilDirty={setVentilDirty}
        langzeitGroups={langzeitGroups}
        setLangzeitGroups={setLangzeitGroups}
        langzeitDirty={langzeitDirty}
        setLangzeitDirty={setLangzeitDirty}
        detailGroups={detailGroups}
        setDetailGroups={setDetailGroups}
        detailDirty={detailDirty}
        setDetailDirty={setDetailDirty}
        komponentenGroups={komponentenGroups}
        setKomponentenGroups={setKomponentenGroups}
        komponentenDirty={komponentenDirty}
        setKomponentenDirty={setKomponentenDirty}
        ventilConfigs={ventilConfigs}
        setVentilConfigs={setVentilConfigs}
        langzeitLiveValues={langzeitLiveValues}
        langzeitEditValues={langzeitEditValues}
        setLangzeitEditValues={setLangzeitEditValues}
        langzeitLoading={langzeitLoading}
        loadLangzeitValues={loadLangzeitValues}
        writeLangzeitValue={writeLangzeitValue}
        isStartingTest={isStartingTest}
        statusMessage={statusMessage}
        startTest={startTest}
      />

      {/* Using Cached Data control moved to SettingsView */}

      {error && (
        <div style={{ padding: '16px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33' }}>
          {error}
        </div>
      )}

      <SystemStatusPanel
        selectedBlock={selectedBlock}
        messMode={messMode}
        operationMode={operationMode}
        batteryStatus={data?.globalData?.batteryStatus}
        getMessModeText={getMessModeText}
        getOperationModeText={getOperationModeText}
      />
      
    </div>
  );
}

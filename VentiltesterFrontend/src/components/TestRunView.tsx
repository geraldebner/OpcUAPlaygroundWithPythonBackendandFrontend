import React, { useState, useEffect } from 'react';
import { useCache } from '../hooks/useCache';
import CommandsPanel from './shared/CommandsPanel';
import EditableGroupsPanel from './EditableGroupsPanel';
import axios from 'axios';

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
  const { data, loading, error, refresh } = useCache(apiBase, selectedBlock, autoRefresh, 2000);

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
    // if it's already an array
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'string') {
      // try parse JSON arrays
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

  // Determine if system is ready to start a test
  const canStartTest = messMode === 0;
  
  // Get status text based on MessMode
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
  
  // Get status text based on OperationMode
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

  // Load next MessID and parameter sets on mount
  useEffect(() => {
    loadNextMessID();
    loadParameterSets();
    loadActiveTestRun();
  }, [selectedBlock]);

  // Load dataset payload into editable groups when a selection changes
  useEffect(() => {
    const load = async () => {
      if (!selectedVentilConfig) { setVentilGroups({}); setVentilDirty(false); return; }
      try {
        const res = await axios.get(`${apiBase}/api/datasets/${selectedVentilConfig}`);
        const payload = res.data?.payload;
        const groups = parseDatasetToGroups(payload);
        // Show only groups related to Ventilkonfiguration
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
        // Keep only langzeittest groups
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
        // Keep only detailtest groups
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
        // Keep only groups named "Ventilkonfiguration Sensor-Regler"
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

  // Load Langzeittest live OPC UA values when testType changes to Langzeittest
  useEffect(() => {
    if (testType === 'Langzeittest') {
      loadLangzeitValues();
    }
  }, [testType, selectedBlock]);

  async function loadLangzeitValues() {
    setLangzeitLoading(true);
    try {
      // Read each parameter individually from AllgemeineParameter group
      const group = 'AllgemeineParameter';
      
      // Read AnzahlGesamtSchlagzahlen
      const gesamtRes = await axios.get(
        `${apiBase}/api/parameters/${selectedBlock}/value?group=${encodeURIComponent(group)}&name=${encodeURIComponent('AnzahlGesamtSchlagzahlen')}`
      );
      const gesamtVal = formatValue(gesamtRes.data?.value);
      
      // Read AnzahlSchlagzahlenDetailtest
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
      // Reload values to confirm write
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
      console.log('Loaded parameter sets:', sets);
      setVentilParameterSets(sets.filter((s: ParameterSet) => 
        s.type === 'VentilAnsteuerparameter'));
      setLangzeittestParameterSets(sets.filter((s: ParameterSet) => 
        s.type === 'VentilLangzeittestparameter'));
      setDetailtestParameterSets(sets.filter((s: ParameterSet) => 
        s.type === 'VentilDetailtestparameter'));
      setKomponentenParameterSets(sets.filter((s: ParameterSet) => 
        s.type === 'Komponenten'));
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
      // No active test run
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
    
    // Check if system is ready (MessMode must be 0)
    if (!canStartTest) {
      const currentTest = getMessModeText(messMode);
      alert(`Kann keinen Test starten!\n\nAktueller Status: ${currentTest}\n\nBitte stoppen Sie zuerst den laufenden Test.`);
      return;
    }

    setIsStartingTest(true);
    setStatusMessage('Test wird vorbereitet...');

    try {
      // Step 1: Prepare and send Ventilkonfiguration (use edited values if present)
      setStatusMessage('Lade Ventilkonfiguration...');
      let ventilPayloadJson: string | null = null;
      try {
        if (Object.keys(ventilGroups).length > 0) {
          ventilPayloadJson = buildPayloadFromGroups(ventilGroups);
          // Persist adjusted set with MessID in the name if user edited
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

      // Step 1.5: Prepare and send Komponenten (use edited values if present)
      setStatusMessage('Lade Komponenten-Konfiguration...');
      let komponentenPayloadJson: string | null = null;
      try {
        if (Object.keys(komponentenGroups).length > 0) {
          komponentenPayloadJson = buildPayloadFromGroups(komponentenGroups);
          // Persist adjusted set with MessID in the name if user edited
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

      // Step 2: Prepare and send test-specific configuration (use edited values if present)
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

      // Step 3: Create TestRun entry in database
      setStatusMessage('Erstelle Prüflauf-Eintrag...');
      
      // Prepare ventil configuration as additional info
      const additionalInfo = JSON.stringify({
        ventilConfigs: ventilConfigs.map(v => ({
          number: v.number,
          enabled: v.enabled,
          comment: v.comment,
          startCounterValue: v.startCounterValue
        }))
      });
      
      console.log('Creating TestRun with data:', {
        testType: testType,
        blockIndex: selectedBlock,
        ventilkonfigurationId: selectedVentilConfig,
        konfigurationLangzeittestId: testType === 'Langzeittest' ? selectedLangzeitConfig : null,
        konfigurationDetailtestId: testType === 'Detailtest' ? selectedDetailConfig : null,
        comment: testComment || `${testType} - Block ${selectedBlock}`,
        additionalInfo: additionalInfo
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
      console.log('TestRun created successfully:', newTestRun);
      setActiveTestRun(newTestRun);

      // Step 4: Set active test run in MeasurementDataService
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

      // Step 5: Start the test run
      setStatusMessage('Starte Prüflauf...');
      try {
        await axios.post(`${apiBase}/api/testruns/${newTestRun.messID}/start`);
      } catch (error: any) {
        console.error('Failed to start TestRun:', error.response?.data);
        throw new Error(`Fehler beim Starten des Prüflaufs: ${error.response?.data?.message || error.message}`);
      }

      // Step 6: Write VentilSperre bitfield to OPC UA
      setStatusMessage('Setze VentilSperre Bitfeld...');
      try {
        await writeVentilSperreToOPCUA();
      } catch (error: any) {
        console.error('Failed to write VentilSperre to OPC UA:', error.response?.data);
        throw new Error(`Fehler beim Schreiben der VentilSperre: ${error.response?.data?.message || error.message}`);
      }

      // Step 7: Write MessID to OPC UA Kommandos group
      setStatusMessage(`Setze MessID ${newTestRun.messID} im PLC...`);
      try {
        await writeMessIDToOPCUA(newTestRun.messID);
      } catch (error: any) {
        console.error('Failed to write MessID to OPC UA:', error.response?.data);
        throw new Error(`Fehler beim Schreiben der MessID: ${error.response?.data?.message || error.message}`);
      }

      // Step 8: Send start command to OPC UA
      try {
        await sendStartCommand();
      } catch (error: any) {
        console.error('Failed to send start command:', error.response?.data);
        throw new Error(`Fehler beim Senden des Start-Kommandos: ${error.response?.data?.message || error.message}`);
      }

      // Step 9: Verify that the test actually started by checking MessMode
      setStatusMessage('Warte auf Bestätigung vom PLC...');
      const expectedMessMode = testType === 'Langzeittest' ? 1 : testType === 'Detailtest' ? 2 : 3;
      const testStarted = await waitForMessModeChange(expectedMessMode, 30000); // extended timeout to 30s with direct-read fallback

      if (!testStarted) {
        // Test didn't start, rollback
        console.error('Test did not start - MessMode did not change');
        setStatusMessage('Test konnte nicht gestartet werden - Rollback...');
        
        // Fail the test run
        await axios.post(`${apiBase}/api/testruns/${newTestRun.messID}/fail`);
        
        // Clear active test run
        await axios.delete(`${apiBase}/api/measurementmonitoring/active-testrun`, {
          params: { blockIndex: selectedBlock }
        });
        
        setActiveTestRun(null);
        throw new Error('PLC hat den Test nicht gestartet. MessMode wurde nicht geändert.');
      }

      setStatusMessage(`Prüflauf ${newTestRun.messID} erfolgreich gestartet!`);
      
      // Reload next MessID for next test
      await loadNextMessID();

      // Clear selections for next test
      setTimeout(() => {
        setStatusMessage('');
      }, 5000);

    } catch (error: any) {
      console.error('Error starting test:', error);
      setStatusMessage(`Fehler beim Starten des Tests: ${error.message}`);
      alert(`Fehler beim Starten des Tests: ${error.message}`);
    } finally {
      setIsStartingTest(false);
    }
  }

  async function waitForMessModeChange(expectedMode: number, timeoutMs: number): Promise<boolean> {
    // Give PLC a moment to react before polling
    await new Promise(resolve => setTimeout(resolve, 1500));

    const startTime = Date.now();
    let intervalMs = 500; // start fast, then back off up to 2.5s

    while (Date.now() - startTime < timeoutMs) {
      try {
        // 1) Try cache endpoint (fast path)
        try {
          const response = await axios.get(`${apiBase}/api/cache/${selectedBlock}`);
          const freshData = response.data;
          const currentMessMode = freshData?.allgemeineParameter?.messMode;
          console.log(`Checking MessMode (cache): current=${currentMessMode}, expected=${expectedMode}`);
          if (currentMessMode === expectedMode) {
            console.log('MessMode confirmed via cache - test started successfully');
            refresh();
            return true;
          }
        } catch (e) {
          console.warn('Cache read failed, will try direct parameter read next.', e);
        }

        // 2) Direct read from parameters endpoint (more up-to-date than cache)
        try {
          const grp = encodeURIComponent('AllgemeineParameter');
          const paramsResp = await axios.get(`${apiBase}/api/parameters/${selectedBlock}/group/${grp}`);
          const list = Array.isArray(paramsResp.data) ? paramsResp.data : [];
          const messModeParam = list.find((p: any) => (p?.name || '').toLowerCase() === 'messmode');
          const directMessMode = messModeParam != null ? Number(messModeParam.value) : undefined;
          console.log(`Checking MessMode (direct): current=${directMessMode}, expected=${expectedMode}`);
          if (directMessMode === expectedMode) {
            console.log('MessMode confirmed via direct read - test started successfully');
            refresh();
            return true;
          }
        } catch (e) {
          console.warn('Direct parameter read failed.', e);
        }
      } catch (error) {
        console.error('Error while checking MessMode:', error);
      }

      // progressive backoff up to 2500ms
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      intervalMs = Math.min(2500, Math.round(intervalMs * 1.5));
    }

    console.error('Timeout waiting for MessMode change after extended checks');
    return false;
  }

  async function sendParametersToOPCUA(payloadJson: string, groupName: string) {
    try {
      console.log('Sending parameters for:', groupName);
      console.log('Payload:', payloadJson);
      
      const payload = JSON.parse(payloadJson);
      const groups = payload.groups || {};
      
      console.log('Groups found:', Object.keys(groups));
      
      // Send each group's parameters
      for (const [gName, params] of Object.entries(groups)) {
        if (Array.isArray(params)) {
          console.log(`Sending ${params.length} parameters for group: ${gName}`);
          
          for (const param of params as any[]) {
            try {
              console.log(`Writing parameter: ${gName} / ${param.name} = ${param.value}`);
              
              const response = await axios.post(
                `${apiBase}/api/parameters/${selectedBlock}/value?group=${encodeURIComponent(gName)}&name=${encodeURIComponent(param.name)}`,
                { value: String(param.value) }
              );
              
              if (!response.data || response.status !== 200) {
                console.warn(`Warning: Parameter ${param.name} response:`, response.status);
              }
            } catch (paramError: any) {
              console.error(`Failed to write parameter ${gName}/${param.name}:`, paramError.response?.data || paramError.message);
              // Continue with other parameters even if one fails
            }
          }
        }
      }
      
      // Small delay to ensure all parameters are written
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log(`Successfully sent all parameters for ${groupName}`);
    } catch (error: any) {
      console.error(`Failed to send parameters for ${groupName}:`, error);
      console.error('Error details:', error.response?.data);
      throw new Error(`Fehler beim Senden der Parameter für ${groupName}: ${error.response?.data?.error || error.message}`);
    }
  }

  async function verifyParameters(payloadJson: string, groupName: string) {
    // Optional: Read back parameters to verify they were written correctly
    // This is a simplified version - you may want to add more detailed verification
    setStatusMessage(`Verifiziere ${groupName}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  async function sendStartCommand() {
    // Send appropriate start command based on test type
    const commandMap: { [key: string]: string } = {
      'Langzeittest': 'Langzeittest_Start',
      'Detailtest': 'Detailtest_Start',
      'Einzeltest': 'Einzeltest_Start'
    };

    const command = commandMap[testType];
    if (!command) {
      throw new Error(`Unbekannter Test-Typ: ${testType}`);
    }

    console.log(`Sending start command: ${command} to Kommandos group`);
    
    try {
      const response = await axios.post(
        `${apiBase}/api/parameters/${selectedBlock}/value?group=Kommandos&name=${encodeURIComponent(command)}`,
        { value: 'true' }
      );
      console.log(`Start command sent successfully:`, response.data);
    } catch (error: any) {
      console.error(`Failed to send start command ${command}:`, error.response?.data);
      
      // Check if the parameter doesn't exist
      if (error.response?.status === 404) {
        throw new Error(`Start-Parameter '${command}' nicht gefunden in Kommandos. Bitte prüfen Sie die OPC UA Konfiguration.`);
      }
      
      throw new Error(`Fehler beim Senden von ${command}: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    }
  }

  async function writeVentilSperreToOPCUA() {
    // Calculate VentilSperre bitfield: 1 = disabled, 0 = enabled
    // Bit 0 = Ventil 1, Bit 1 = Ventil 2, etc.
    let ventilSperre = 0;
    for (let i = 0; i < 16; i++) {
      if (!ventilConfigs[i].enabled) {
        ventilSperre |= (1 << i);
      }
    }

    console.log(`Writing VentilSperre bitfield: ${ventilSperre} (binary: ${ventilSperre.toString(2).padStart(16, '0')})`);
    console.log('Ventil states:', ventilConfigs.map(v => `V${v.number}:${v.enabled ? 'ON' : 'OFF'}`).join(', '));
    
    try {
      const response = await axios.post(
        `${apiBase}/api/parameters/${selectedBlock}/value?group=AllgemeineParameter&name=${encodeURIComponent('VentilSperre')}`,
        { value: String(ventilSperre) }
      );
      console.log(`VentilSperre written successfully:`, response.data);
    } catch (error: any) {
      console.error('Failed to write VentilSperre:', error.response?.data);
      
      if (error.response?.status === 404) {
        throw new Error(`VentilSperre Parameter nicht gefunden in AllgemeineParameter. Bitte prüfen Sie die OPC UA Konfiguration.`);
      }
      
      throw new Error(`Fehler beim Schreiben der VentilSperre: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    }
  }

  async function writeMessIDToOPCUA(messID: number) {
    // Map test type to the correct MessID parameter in Kommandos group
    const messIDParamMap: { [key: string]: string } = {
      'Langzeittest': 'MessIDLongterm',
      'Detailtest': 'MessIDDetail',
      'Einzeltest': 'MessIDSingle'
    };

    const paramName = messIDParamMap[testType];
    if (!paramName) {
      throw new Error(`Unbekannter Test-Typ für MessID: ${testType}`);
    }

    console.log(`Writing MessID ${messID} to Kommandos/${paramName}`);
    
    try {
      const response = await axios.post(
        `${apiBase}/api/parameters/${selectedBlock}/value?group=Kommandos&name=${encodeURIComponent(paramName)}`,
        { value: String(messID) }
      );
      console.log(`MessID written successfully:`, response.data);
    } catch (error: any) {
      console.error(`Failed to write MessID to ${paramName}:`, error.response?.data);
      
      if (error.response?.status === 404) {
        throw new Error(`MessID-Parameter '${paramName}' nicht gefunden in Kommandos. Bitte prüfen Sie die OPC UA Konfiguration.`);
      }
      
      throw new Error(`Fehler beim Schreiben der MessID zu ${paramName}: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
    }
  }

  async function stopTest() {
    if (!activeTestRun) return;

    try {
      // Determine which stop command to send based on current MessMode
      let stopCommand = 'Stop';
      if (messMode === 1) {
        stopCommand = 'Langzeittest_Stop';
      } else if (messMode === 2) {
        stopCommand = 'Detailtest_Stop';
      } else if (messMode === 3) {
        stopCommand = 'Einzeltest_Stop';
      }
      
      setStatusMessage(`Sende ${stopCommand} Kommando...`);
      console.log(`Sending stop command: ${stopCommand}`);

      // Send stop command to OPC UA
      await axios.post(
        `${apiBase}/api/parameters/${selectedBlock}/value?group=Kommandos&name=${stopCommand}`,
        { value: 'true' }
      );

      // Complete the test run
      await axios.post(`${apiBase}/api/testruns/${activeTestRun.messID}/complete`);

      // Clear active test run
      await axios.delete(`${apiBase}/api/measurementmonitoring/active-testrun`, {
        params: { blockIndex: selectedBlock }
      });

      setActiveTestRun(null);
      setStatusMessage('Test gestoppt');
      
      setTimeout(() => {
        setStatusMessage('');
      }, 3000);
    } catch (error: any) {
      console.error('Error stopping test:', error);
      alert(`Fehler beim Stoppen des Tests: ${error.message}`);
    }
  }

  // Styles
  const thStyle: React.CSSProperties = {
    padding: '12px 8px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '12px',
    borderBottom: '2px solid #2c3e50'
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 8px',
    textAlign: 'center',
    borderBottom: '1px solid #e9ecef'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
      {/* Test Run Control Panel */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '2px solid #3498db'
      }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#2c3e50', fontSize: '16px', fontWeight: 'bold' }}>
          🚀 Test Run Control - Block {selectedBlock}
        </h2>

        {/* Active Test Run Display */}
        {activeTestRun && messMode !== null && messMode > 0 && (
          <div style={{
            padding: '12px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#155724', marginBottom: '8px' }}>
              ✅ Aktiver Prüflauf
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px' }}>
              <div><strong>MessID:</strong> {activeTestRun.messID}</div>
              <div><strong>Typ:</strong> {activeTestRun.testType}</div>
              <div><strong>Status:</strong> {activeTestRun.status}</div>
              <div><strong>Gestartet:</strong> {new Date(activeTestRun.startedAt).toLocaleString()}</div>
            </div>
            <button
              onClick={stopTest}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ⏹ Test Stoppen
            </button>
          </div>
        )}

        {/* Warning if database shows active test but PLC doesn't */}
        {activeTestRun && messMode === 0 && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '8px' }}>
              ⚠️ Warnung: Inkonsistenter Zustand
            </div>
            <div style={{ fontSize: '12px', color: '#856404', marginBottom: '8px' }}>
              Ein Prüflauf (MessID: {activeTestRun.messID}) ist in der Datenbank aktiv, aber der PLC zeigt MessMode=0 (keine Messung).
              Der Test läuft möglicherweise nicht wirklich.
            </div>
            <button
              onClick={async () => {
                if (confirm('Möchten Sie den Prüflauf-Status zurücksetzen?')) {
                  try {
                    await axios.post(`${apiBase}/api/testruns/${activeTestRun.messID}/fail`);
                    await axios.delete(`${apiBase}/api/measurementmonitoring/active-testrun`, {
                      params: { blockIndex: selectedBlock }
                    });
                    setActiveTestRun(null);
                    alert('Prüflauf wurde zurückgesetzt.');
                  } catch (error: any) {
                    alert(`Fehler beim Zurücksetzen: ${error.message}`);
                  }
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Prüflauf zurücksetzen
            </button>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div style={{
            padding: '12px',
            backgroundColor: isStartingTest ? '#fff3cd' : '#d1ecf1',
            border: `1px solid ${isStartingTest ? '#ffc107' : '#bee5eb'}`,
            borderRadius: '6px',
            marginBottom: '16px',
            color: isStartingTest ? '#856404' : '#0c5460'
          }}>
            {statusMessage}
          </div>
        )}

        {/* Test Configuration */}
        {!activeTestRun && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Test Type Selection */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                Test-Typ:
              </label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as any)}
                disabled={isStartingTest}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="Langzeittest">Langzeittest</option>
                <option value="Detailtest">Detailtest</option>
                <option value="Einzeltest">Einzeltest</option>
              </select>
            </div>

            {/* Configuration and Ventil Layout - Side by Side */}
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Left Column - Parameter Configurations */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
              

                {/* Ventilkonfiguration Selection */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                    Ventilkonfiguration: *
                  </label>
                  <select
                    value={selectedVentilConfig || ''}
                    onChange={(e) => setSelectedVentilConfig(Number(e.target.value) || null)}
                    disabled={isStartingTest}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">-- Bitte auswählen --</option>
                    {ventilParameterSets.map(ps => (
                      <option key={ps.id} value={ps.id}>
                        {ps.name} {ps.comment && `(${ps.comment})`}
                      </option>
                    ))}
                  </select>
                  <EditableGroupsPanel
                    title="Ventilkonfiguration"
                    groups={ventilGroups}
                    setGroups={setVentilGroups}
                    onDirty={setVentilDirty}
                  />
                </div>

                {/* Komponenten Configuration */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                    Komponenten (Sensor-Regler): *
                  </label>
                  <select
                    value={selectedKomponentenConfig || ''}
                    onChange={(e) => setSelectedKomponentenConfig(Number(e.target.value) || null)}
                    disabled={isStartingTest}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">-- Bitte auswählen --</option>
                    {komponentenParameterSets.map(ps => (
                      <option key={ps.id} value={ps.id}>
                        {ps.name} {ps.comment && `(${ps.comment})`}
                      </option>
                    ))}
                  </select>
                  <EditableGroupsPanel
                    title="Komponenten"
                    groups={komponentenGroups}
                    setGroups={setKomponentenGroups}
                    onDirty={setKomponentenDirty}
                  />
                </div>

                {/* Langzeittest Configuration */}
                {testType === 'Langzeittest' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                      Langzeittest-Konfiguration: *
                    </label>
                    <select
                      value={selectedLangzeitConfig || ''}
                      onChange={(e) => setSelectedLangzeitConfig(Number(e.target.value) || null)}
                      disabled={isStartingTest}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">-- Bitte auswählen --</option>
                      {langzeittestParameterSets.map(ps => (
                        <option key={ps.id} value={ps.id}>
                          {ps.name} {ps.comment && `(${ps.comment})`}
                        </option>
                      ))}
                    </select>
                    <EditableGroupsPanel
                      title="Langzeittest"
                      groups={langzeitGroups}
                      setGroups={setLangzeitGroups}
                      onDirty={setLangzeitDirty}
                    />
                  </div>
                )}

                {/* Langzeittest Live OPC UA Values */}
                {testType === 'Langzeittest' && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f0f8ff',
                    border: '2px solid #4169e1',
                    borderRadius: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontWeight: 'bold', color: '#1e40af' }}>
                        📊 Langzeittest OPC UA Parameter (Live)
                      </label>
                      <button
                        onClick={() => loadLangzeitValues()}
                        disabled={langzeitLoading}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: langzeitLoading ? '#95a5a6' : '#3498db',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: langzeitLoading ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        {langzeitLoading ? '⏳ Laden...' : '🔄 Aktualisieren'}
                      </button>
                    </div>

                    {/* AnzahlGesamtSchlagzahlen */}
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                        Anzahl Gesamt Schlagzahlen
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={langzeitEditValues.anzahlGesamtSchlagzahlen}
                          onChange={(e) => setLangzeitEditValues({
                            ...langzeitEditValues,
                            anzahlGesamtSchlagzahlen: e.target.value
                          })}
                          disabled={langzeitLoading}
                          style={{
                            padding: '6px 8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                        <button
                          onClick={() => writeLangzeitValue('AnzahlGesamtSchlagzahlen', langzeitEditValues.anzahlGesamtSchlagzahlen)}
                          disabled={langzeitLoading}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: langzeitLoading ? '#95a5a6' : '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: langzeitLoading ? 'not-allowed' : 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}
                        >
                          ✓ Schreiben
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        Aktuell: <strong>{langzeitLiveValues.anzahlGesamtSchlagzahlen === null ? '--' : langzeitLiveValues.anzahlGesamtSchlagzahlen === '' ? '(leer)' : langzeitLiveValues.anzahlGesamtSchlagzahlen}</strong>
                      </div>
                    </div>

                    {/* AnzahlSchlagzahlenDetailtest */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                        Anzahl Schlagzahlen Detailtest
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={langzeitEditValues.anzahlSchlagzahlenDetailtest}
                          onChange={(e) => setLangzeitEditValues({
                            ...langzeitEditValues,
                            anzahlSchlagzahlenDetailtest: e.target.value
                          })}
                          disabled={langzeitLoading}
                          style={{
                            padding: '6px 8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                        <button
                          onClick={() => writeLangzeitValue('AnzahlSchlagzahlenDetailtest', langzeitEditValues.anzahlSchlagzahlenDetailtest)}
                          disabled={langzeitLoading}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: langzeitLoading ? '#95a5a6' : '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: langzeitLoading ? 'not-allowed' : 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}
                        >
                          ✓ Schreiben
                        </button>
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        Aktuell: <strong>{langzeitLiveValues.anzahlSchlagzahlenDetailtest === null ? '--' : langzeitLiveValues.anzahlSchlagzahlenDetailtest === '' ? '(leer)' : langzeitLiveValues.anzahlSchlagzahlenDetailtest}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailtest Configuration */}
                {testType === 'Detailtest' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                      Detailtest-Konfiguration: *
                    </label>
                    <select
                      value={selectedDetailConfig || ''}
                      onChange={(e) => setSelectedDetailConfig(Number(e.target.value) || null)}
                      disabled={isStartingTest}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">-- Bitte auswählen --</option>
                      {detailtestParameterSets.map(ps => (
                        <option key={ps.id} value={ps.id}>
                          {ps.name} {ps.comment && `(${ps.comment})`}
                        </option>
                      ))}
                    </select>
                    <EditableGroupsPanel
                      title="Detailtest"
                      groups={detailGroups}
                      setGroups={setDetailGroups}
                      onDirty={setDetailDirty}
                    />
                  </div>
                )}

                {/* Comment field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                    Kommentar (optional):
                  </label>
                  <input
                    type="text"
                    value={testComment}
                    onChange={(e) => setTestComment(e.target.value)}
                    disabled={isStartingTest}
                    placeholder="Optional: Beschreibung des Tests"
                    style={{
                      width: '97%',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                {/* Next MessID Display */}
                <div style={{
                  padding: '12px',
                  backgroundColor: '#e8f4f8',
                  borderRadius: '6px',
                  border: '1px solid #b3d9e6'
                }}>
                  <strong>Nächste MessID:</strong> {nextMessID !== null ? nextMessID : 'Laden...'}
                </div>
              </div>

              {/* Right Column - Ventil Configuration */}
              <div style={{ flex: '1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Ventil-Konfiguration (16 Ventile):
                </label>
                <div style={{
                  maxHeight: '800px',
                  overflowY: 'auto',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '8px',
                  backgroundColor: '#f8f9fa'
                }}>
                  {ventilConfigs.map((ventil) => (
                    <div key={ventil.number} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px',
                      padding: '6px',
                      backgroundColor: 'white',
                      borderRadius: '3px',
                      border: '1px solid #e9ecef'
                    }}>
                      <input
                        type="checkbox"
                        checked={ventil.enabled}
                        onChange={(e) => {
                          const updated = [...ventilConfigs];
                          updated[ventil.number - 1].enabled = e.target.checked;
                          setVentilConfigs(updated);
                        }}
                        disabled={isStartingTest}
                        style={{ cursor: 'pointer' }}
                      />
                      <label style={{ minWidth: '80px', fontSize: '13px', fontWeight: 'bold' }}>
                        Ventil {ventil.number}:
                      </label>
                      <input
                        type="text"
                        value={ventil.comment}
                        onChange={(e) => {
                          const updated = [...ventilConfigs];
                          updated[ventil.number - 1].comment = e.target.value;
                          setVentilConfigs(updated);
                        }}
                        disabled={isStartingTest}
                        placeholder="Kommentar..."
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          border: '1px solid #ccc',
                          borderRadius: '3px',
                          fontSize: '12px'
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '12px', color: '#555' }}>Startzähler:</label>
                        <input
                          type="number"
                          value={ventil.startCounterValue}
                          onChange={(e) => {
                            const updated = [...ventilConfigs];
                            const val = Number(e.target.value);
                            updated[ventil.number - 1].startCounterValue = isNaN(val) ? 0 : val;
                            setVentilConfigs(updated);
                          }}
                          disabled={isStartingTest}
                          min={0}
                          style={{
                            width: '90px',
                            padding: '4px 8px',
                            border: '1px solid #ccc',
                            borderRadius: '3px',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#666' }}>
                  ℹ️ Aktivierte Ventile werden im Test berücksichtigt. Deaktivierte Ventile werden in VentilSperre gesetzt. Der Startzähler wird beim Start in den PLC geschrieben (Standard 0).
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startTest}
              disabled={isStartingTest || !selectedVentilConfig || !selectedKomponentenConfig}
              style={{
                padding: '12px 24px',
                backgroundColor: isStartingTest || !selectedVentilConfig || !selectedKomponentenConfig ? '#95a5a6' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isStartingTest || !selectedVentilConfig || !selectedKomponentenConfig ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {isStartingTest ? '⏳ Wird gestartet...' : '▶ Test Starten'}
            </button>
          </div>
        )}
      </div>

      {/* Header with cache info */}
      <div style={{
        backgroundColor: '#e8f4f8',
        borderRadius: '8px',
        padding: '12px 16px',
        border: '1px solid #b3d9e6'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>🔄 Using Cached Data</strong>
            {data && (
              <span style={{ marginLeft: '12px', fontSize: '13px', color: '#666' }}>
                Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto Refresh (2s)</span>
          </label>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c33'
        }}>
          {error}
        </div>
      )}

      {/* System Status Panel */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '2px solid #95a5a6'
      }}>
        <h2 style={{ margin: '0 0 12px 0', color: '#2c3e50', fontSize: '16px', fontWeight: 'bold' }}>
          📊 System Status - Block {selectedBlock}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          {/* MessMode Status */}
          <div style={{
            padding: '12px',
            backgroundColor: messMode === 0 ? '#d4edda' : '#fff3cd',
            border: `2px solid ${messMode === 0 ? '#c3e6cb' : '#ffc107'}`,
            borderRadius: '6px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '4px', fontSize: '12px' }}>
              Mess Mode:
            </div>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 'bold',
              color: messMode === 0 ? '#155724' : '#856404'
            }}>
              {getMessModeText(messMode)} {messMode !== null && `(${messMode})`}
            </div>
          </div>

          {/* OperationMode Status */}
          <div style={{
            padding: '12px',
            backgroundColor: '#e8f4f8',
            border: '2px solid #b3d9e6',
            borderRadius: '6px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '4px', fontSize: '12px' }}>
              Operation Mode:
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0c5460' }}>
              {getOperationModeText(operationMode)} {operationMode !== null && `(${operationMode})`}
            </div>
          </div>

          {/* Battery Status */}
          {data?.globalData?.batteryStatus !== undefined && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              border: '2px solid #dee2e6',
              borderRadius: '6px'
            }}>
              <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '4px', fontSize: '12px' }}>
                Batterie Status:
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#28a745' }}>
                {(data.globalData.batteryStatus * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Section - Global Data and Allgemeine Parameter */}
      {(data?.globalData || data?.allgemeineParameter) && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '14px', fontWeight: 'bold' }}>
            Status - Block {selectedBlock}
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Global Data */}
            {data?.globalData && (
              <div style={{
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px'
              }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Global Data</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '8px'
                }}>
                  <DataCard label="Battery Status" value={data.globalData.batteryStatus * 100} unit="%" />
                  <BitfieldCard label="General Errors" value={data.globalData.generalErrors} />
                  <DataCard label="Temperature PLC" value={data.globalData.temperaturePLC} unit="°C" />
                  <IntegerCard label="Version" value={data.globalData.version} />
                </div>
              </div>
            )}
            
            {/* Allgemeine Parameter */}
            {data?.allgemeineParameter && (
              <div style={{
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px'
              }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Allgemeine Parameter</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '8px'
                }}>
                  <BitfieldCard label="Fehlerbit" value={data.allgemeineParameter.fehlerbit} />
                  <DataCard label="Air Pressure" value={data.allgemeineParameter.currentAirPressure} unit="mbar" />
                  <DataCard label="Air Flow" value={data.allgemeineParameter.currentAirFlow} unit="l/min" />
                  <DataCard label="Force" value={data.allgemeineParameter.currentForce} unit="N" />
                  <div style={{
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Mess Mode</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#212529' }}>
                      {getMessModeText(data.allgemeineParameter.messMode)} ({data.allgemeineParameter.messMode})
                    </div>
                  </div>
                  <div style={{
                    padding: '8px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Operation Mode</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#212529' }}>
                      {getOperationModeText(data.allgemeineParameter.operationMode)} ({data.allgemeineParameter.operationMode})
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Commands Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '14px', fontWeight: 'bold' }}>Commands</h2>
        <CommandsPanel apiBase={apiBase} selectedBlock={selectedBlock} compact={true} />
      </div>

      {/* Ventil Data Table */}
      {data?.ventilData && data.ventilData.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>Ventil Status Overview</h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th style={thStyle} rowSpan={2}>Ventil</th>
                  <th style={thStyle} rowSpan={2}>Zähler</th>
                  <th style={thStyle} colSpan={3}>Strommessung</th>
                  <th style={thStyle} colSpan={3}>Durchflussmessung</th>
                  <th style={thStyle} colSpan={3}>Kraftmessung</th>
                </tr>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Ready</th>
                  <th style={thStyle}>MessID</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Ready</th>
                  <th style={thStyle}>MessID</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Ready</th>
                  <th style={thStyle}>MessID</th>
                </tr>
              </thead>
              <tbody>
                {data.ventilData.map((ventil: any, idx: number) => (
                  <tr key={ventil.ventilNr} style={{
                    backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white'
                  }}>
                    <td style={tdStyle}><strong>Ventil {ventil.ventilNr}</strong></td>
                    <td style={tdStyle}><strong>{ventil.zaehler}</strong></td>
                    <td style={tdStyle}>{ventil.strom.status}</td>
                    <td style={tdStyle}>{ventil.strom.datenReady}</td>
                    <td style={tdStyle}>{ventil.strom.messID}</td>
                    <td style={tdStyle}>{ventil.durchfluss.status}</td>
                    <td style={tdStyle}>{ventil.durchfluss.datenReady}</td>
                    <td style={tdStyle}>{ventil.durchfluss.messID}</td>
                    <td style={tdStyle}>{ventil.kraft.status}</td>
                    <td style={tdStyle}>{ventil.kraft.datenReady}</td>
                    <td style={tdStyle}>{ventil.kraft.messID}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function DataCard({ label, value, unit }: { label: string; value: number | null | undefined; unit?: string }) {
  const displayValue = value != null && typeof value === 'number' ? value.toFixed(2) : '--';
  
  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#2c3e50'
      }}>
        {displayValue} {unit && <span style={{ fontSize: '12px', color: '#7f8c8d' }}>{unit}</span>}
      </div>
    </div>
  );
}

// Bitfield display component for Fehlerbit
function BitfieldCard({ label, value }: { label: string; value: number | null | undefined }) {
  const bitValue = value != null && typeof value === 'number' ? Math.round(value) : 0;
  const binaryString = bitValue.toString(2).padStart(8, '0');
  
  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#2c3e50',
        fontFamily: 'monospace'
      }}>
        {binaryString} <span style={{ fontSize: '12px', color: '#7f8c8d' }}>(0x{bitValue.toString(16).toUpperCase()})</span>
      </div>
    </div>
  );
}

// Integer display component (no decimal places)
function IntegerCard({ label, value }: { label: string; value: number | null | undefined }) {
  const displayValue = value != null && typeof value === 'number' ? Math.round(value).toString() : '--';
  
  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#2c3e50'
      }}>
        {displayValue}
      </div>
    </div>
  );
}

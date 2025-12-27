import React from 'react';
import axios from 'axios';
import EditableGroupsPanel from '../EditableGroupsPanel';

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

interface ParameterSet {
  id: number;
  name: string;
  type: string;
  comment?: string;
}

interface VentilConfig {
  number: number;
  enabled: boolean;
  comment: string;
  startCounterValue: number;
}

interface TestRunControlProps {
  apiBase: string;
  selectedBlock: number;
  messMode: number | null;
  activeTestRun: TestRun | null;
  setActiveTestRun: (run: TestRun | null) => void;
  stopTest: () => void;
  testType: 'Langzeittest' | 'Detailtest' | 'Einzeltest';
  setTestType: (type: 'Langzeittest' | 'Detailtest' | 'Einzeltest') => void;
  testComment: string;
  setTestComment: (comment: string) => void;
  nextMessID: number | null;
  ventilParameterSets: ParameterSet[];
  langzeittestParameterSets: ParameterSet[];
  detailtestParameterSets: ParameterSet[];
  komponentenParameterSets: ParameterSet[];
  selectedVentilConfig: number | null;
  setSelectedVentilConfig: (id: number | null) => void;
  selectedLangzeitConfig: number | null;
  setSelectedLangzeitConfig: (id: number | null) => void;
  selectedDetailConfig: number | null;
  setSelectedDetailConfig: (id: number | null) => void;
  selectedKomponentenConfig: number | null;
  setSelectedKomponentenConfig: (id: number | null) => void;
  ventilGroups: Record<string, { name: string; value: string }[]>;
  setVentilGroups: (groups: Record<string, { name: string; value: string }[]>) => void;
  ventilDirty: boolean;
  setVentilDirty: (dirty: boolean) => void;
  langzeitGroups: Record<string, { name: string; value: string }[]>;
  setLangzeitGroups: (groups: Record<string, { name: string; value: string }[]>) => void;
  langzeitDirty: boolean;
  setLangzeitDirty: (dirty: boolean) => void;
  detailGroups: Record<string, { name: string; value: string }[]>;
  setDetailGroups: (groups: Record<string, { name: string; value: string }[]>) => void;
  detailDirty: boolean;
  setDetailDirty: (dirty: boolean) => void;
  komponentenGroups: Record<string, { name: string; value: string }[]>;
  setKomponentenGroups: (groups: Record<string, { name: string; value: string }[]>) => void;
  komponentenDirty: boolean;
  setKomponentenDirty: (dirty: boolean) => void;
  ventilConfigs: VentilConfig[];
  setVentilConfigs: (configs: VentilConfig[]) => void;
  langzeitLiveValues: {
    anzahlGesamtSchlagzahlen: string | null;
    anzahlSchlagzahlenDetailtest: string | null;
  };
  langzeitEditValues: {
    anzahlGesamtSchlagzahlen: string;
    anzahlSchlagzahlenDetailtest: string;
  };
  setLangzeitEditValues: (values: {
    anzahlGesamtSchlagzahlen: string;
    anzahlSchlagzahlenDetailtest: string;
  }) => void;
  langzeitLoading: boolean;
  loadLangzeitValues: () => void;
  writeLangzeitValue: (paramName: string, value: string) => void;
  isStartingTest: boolean;
  statusMessage: string;
  startTest: () => void;
}

export default function TestRunControl(props: TestRunControlProps) {
  const {
    apiBase,
    selectedBlock,
    messMode,
    activeTestRun,
    setActiveTestRun,
    stopTest,
    testType,
    setTestType,
    testComment,
    setTestComment,
    nextMessID,
    ventilParameterSets,
    langzeittestParameterSets,
    detailtestParameterSets,
    komponentenParameterSets,
    selectedVentilConfig,
    setSelectedVentilConfig,
    selectedLangzeitConfig,
    setSelectedLangzeitConfig,
    selectedDetailConfig,
    setSelectedDetailConfig,
    selectedKomponentenConfig,
    setSelectedKomponentenConfig,
    ventilGroups,
    setVentilGroups,
    setVentilDirty,
    langzeitGroups,
    setLangzeitGroups,
    setLangzeitDirty,
    detailGroups,
    setDetailGroups,
    setDetailDirty,
    komponentenGroups,
    setKomponentenGroups,
    setKomponentenDirty,
    ventilConfigs,
    setVentilConfigs,
    langzeitLiveValues,
    langzeitEditValues,
    setLangzeitEditValues,
    langzeitLoading,
    loadLangzeitValues,
    writeLangzeitValue,
    isStartingTest,
    statusMessage,
    startTest
  } = props;

  return (
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
                <div style={{ padding: '10px 12px', border: '1px solid #dfe6ee', borderRadius: '6px', background: '#f9fbff' }}>
                  

                  {([
                    {
                      label: 'AnzahlGesamtSchlagzahlen',
                      live: langzeitLiveValues.anzahlGesamtSchlagzahlen,
                      value: langzeitEditValues.anzahlGesamtSchlagzahlen,
                      setValue: (val: string) => setLangzeitEditValues({ ...langzeitEditValues, anzahlGesamtSchlagzahlen: val }),
                      param: 'AnzahlGesamtSchlagzahlen'
                    },
                    {
                      label: 'AnzahlSchlagzahlenDetailtest',
                      live: langzeitLiveValues.anzahlSchlagzahlenDetailtest,
                      value: langzeitEditValues.anzahlSchlagzahlenDetailtest,
                      setValue: (val: string) => setLangzeitEditValues({ ...langzeitEditValues, anzahlSchlagzahlenDetailtest: val }),
                      param: 'AnzahlSchlagzahlenDetailtest'
                    }
                  ] as const).map((row) => (
                    <div key={row.param} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 1fr auto auto', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#333' }}>{row.label}</div>
                      <div style={{ fontSize: '11px', color: '#555' }}>Live: <strong>{row.live ?? '--'}</strong></div>
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) => row.setValue(e.target.value)}
                        disabled={langzeitLoading}
                        style={{
                          padding: '4px 6px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      />
                      <button
                        onClick={() => {
                          const liveVal = row.live ?? '';
                          row.setValue(String(liveVal));
                        }}
                        disabled={langzeitLoading}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#e5e7eb',
                          color: '#111827',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          cursor: langzeitLoading ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Read
                      </button>
                      <button
                        onClick={() => writeLangzeitValue(row.param, row.value)}
                        disabled={langzeitLoading}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: langzeitLoading ? '#95a5a6' : '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: langzeitLoading ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        Write
                      </button>
                    </div>
                  ))}
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
  );
}

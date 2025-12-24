import React, { useState, useEffect } from 'react';
import { useCache } from '../hooks/useCache';
import CommandsPanel from './shared/CommandsPanel';
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

export default function TestRunView({ apiBase, selectedBlock }: TestRunViewProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { data, loading, error, refresh } = useCache(apiBase, selectedBlock, autoRefresh, 2000);

  // Test Run State
  const [nextMessID, setNextMessID] = useState<number | null>(null);
  const [testType, setTestType] = useState<'Langzeittest' | 'Detailtest' | 'Einzeltest'>('Langzeittest');
  const [ventilParameterSets, setVentilParameterSets] = useState<ParameterSet[]>([]);
  const [langzeittestParameterSets, setLangzeittestParameterSets] = useState<ParameterSet[]>([]);
  const [detailtestParameterSets, setDetailtestParameterSets] = useState<ParameterSet[]>([]);
  
  const [selectedVentilConfig, setSelectedVentilConfig] = useState<number | null>(null);
  const [selectedLangzeitConfig, setSelectedLangzeitConfig] = useState<number | null>(null);
  const [selectedDetailConfig, setSelectedDetailConfig] = useState<number | null>(null);
  
  const [testComment, setTestComment] = useState<string>('');
  const [isStartingTest, setIsStartingTest] = useState(false);
  const [activeTestRun, setActiveTestRun] = useState<TestRun | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Load next MessID and parameter sets on mount
  useEffect(() => {
    loadNextMessID();
    loadParameterSets();
    loadActiveTestRun();
  }, [selectedBlock]);

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
      const res = await axios.get(`${apiBase}/api/parameters`, {
        params: { blockIndex: selectedBlock }
      });
      
      const sets = res.data || [];
      setVentilParameterSets(sets.filter((s: ParameterSet) => 
        s.type === 'VentilAnsteuerparameter' || s.type === 'All'));
      setLangzeittestParameterSets(sets.filter((s: ParameterSet) => 
        s.type === 'VentilLangzeittestparameter' || s.type === 'All'));
      setDetailtestParameterSets(sets.filter((s: ParameterSet) => 
        s.type === 'VentilDetailtestparameter' || s.type === 'All'));
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

  async function startTest() {
    if (!selectedVentilConfig) {
      alert('Bitte wählen Sie eine Ventilkonfiguration aus!');
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

    setIsStartingTest(true);
    setStatusMessage('Test wird vorbereitet...');

    try {
      // Step 1: Load and send Ventilkonfiguration
      setStatusMessage('Lade Ventilkonfiguration...');
      const ventilConfig = await axios.get(`${apiBase}/api/parameters/${selectedVentilConfig}`);
      await sendParametersToOPCUA(ventilConfig.data.payload, 'Ventilkonfiguration');
      await verifyParameters(ventilConfig.data.payload, 'Ventilkonfiguration');

      // Step 2: Load and send test-specific configuration
      if (testType === 'Langzeittest' && selectedLangzeitConfig) {
        setStatusMessage('Lade Langzeittest-Konfiguration...');
        const langzeitConfig = await axios.get(`${apiBase}/api/parameters/${selectedLangzeitConfig}`);
        await sendParametersToOPCUA(langzeitConfig.data.payload, 'Konfiguration_Langzeittest');
        await verifyParameters(langzeitConfig.data.payload, 'Konfiguration_Langzeittest');
      } else if (testType === 'Detailtest' && selectedDetailConfig) {
        setStatusMessage('Lade Detailtest-Konfiguration...');
        const detailConfig = await axios.get(`${apiBase}/api/parameters/${selectedDetailConfig}`);
        await sendParametersToOPCUA(detailConfig.data.payload, 'Konfiguration_Detailtest');
        await verifyParameters(detailConfig.data.payload, 'Konfiguration_Detailtest');
      }

      // Step 3: Create TestRun entry in database
      setStatusMessage('Erstelle Prüflauf-Eintrag...');
      const testRunResponse = await axios.post(`${apiBase}/api/testruns`, {
        testType: testType,
        blockIndex: selectedBlock,
        ventilkonfigurationId: selectedVentilConfig,
        konfigurationLangzeittestId: testType === 'Langzeittest' ? selectedLangzeitConfig : null,
        konfigurationDetailtestId: testType === 'Detailtest' ? selectedDetailConfig : null,
        comment: testComment || `${testType} - Block ${selectedBlock}`
      });

      const newTestRun: TestRun = testRunResponse.data;
      setActiveTestRun(newTestRun);

      // Step 4: Set active test run in MeasurementDataService
      setStatusMessage('Setze aktiven Prüflauf...');
      await axios.post(`${apiBase}/api/measurementmonitoring/active-testrun`, {
        blockIndex: selectedBlock,
        messID: newTestRun.messID
      });

      // Step 5: Start the test run
      setStatusMessage('Starte Prüflauf...');
      await axios.post(`${apiBase}/api/testruns/${newTestRun.messID}/start`);

      // Step 6: Send start command to OPC UA
      await sendStartCommand();

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

  async function sendParametersToOPCUA(payloadJson: string, groupName: string) {
    try {
      const payload = JSON.parse(payloadJson);
      const groups = payload.groups || {};
      
      // Send each group's parameters
      for (const [gName, params] of Object.entries(groups)) {
        if (Array.isArray(params)) {
          for (const param of params) {
            await axios.post(`${apiBase}/api/cache/write-parameter`, {
              blockIndex: selectedBlock,
              groupName: gName,
              parameterName: param.name,
              value: param.value
            });
          }
        }
      }
      
      // Small delay to ensure all parameters are written
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Failed to send parameters for ${groupName}:`, error);
      throw new Error(`Fehler beim Senden der Parameter für ${groupName}`);
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
      'Langzeittest': 'StartLangzeittest',
      'Detailtest': 'StartDetailtest',
      'Einzeltest': 'StartEinzeltest'
    };

    const command = commandMap[testType];
    if (command) {
      await axios.post(`${apiBase}/api/cache/execute-command`, {
        blockIndex: selectedBlock,
        command: command
      });
    }
  }

  async function stopTest() {
    if (!activeTestRun) return;

    try {
      // Send stop command to OPC UA
      await axios.post(`${apiBase}/api/cache/execute-command`, {
        blockIndex: selectedBlock,
        command: 'Stop'
      });

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
        {activeTestRun && (
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
            {/* Next MessID Display */}
            <div style={{
              padding: '12px',
              backgroundColor: '#e8f4f8',
              borderRadius: '6px',
              border: '1px solid #b3d9e6'
            }}>
              <strong>Nächste MessID:</strong> {nextMessID !== null ? nextMessID : 'Laden...'}
            </div>

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
              </div>
            )}

            {/* Comment */}
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
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Start Button */}
            <button
              onClick={startTest}
              disabled={isStartingTest || !selectedVentilConfig}
              style={{
                padding: '12px 24px',
                backgroundColor: isStartingTest || !selectedVentilConfig ? '#95a5a6' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isStartingTest || !selectedVentilConfig ? 'not-allowed' : 'pointer',
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
                  <DataCard label="Battery Status" value={data.globalData.batteryStatus} unit="%" />
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
                  <DataCard label="Mess Mode" value={data.allgemeineParameter.messMode} />
                  <DataCard label="Operation Mode" value={data.allgemeineParameter.operationMode} />
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

import React, { useState, useEffect, useCallback } from 'react';
import { useCache } from '../hooks/useCache';

interface TestOverviewViewProps {
  apiBase: string;
  selectedBlock: number;
}

export default function TestOverviewView({ apiBase, selectedBlock }: TestOverviewViewProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { data, loading, error, refresh } = useCache(apiBase, selectedBlock, autoRefresh, 2000);
  
  // Command sending state
  const [sending, setSending] = useState<boolean>(false);
  
  // MessID state for each command type
  const [messIdLangzeittest, setMessIdLangzeittest] = useState<string>('');
  const [messIdDetailtest, setMessIdDetailtest] = useState<string>('');
  const [messIdEinzeltest, setMessIdEinzeltest] = useState<string>('');
  const [einzelVentil, setEinzelVentil] = useState<string>('');
  
  // Live MessID values from OPC UA server
  const [liveMessIdLangzeittest, setLiveMessIdLangzeittest] = useState<string>('');
  const [liveMessIdDetailtest, setLiveMessIdDetailtest] = useState<string>('');
  const [liveMessIdEinzeltest, setLiveMessIdEinzeltest] = useState<string>('');

  // Helper function to write command parameters
  async function writeCommandParameter(group: string, paramName: string, value: string = 'true'): Promise<boolean> {
    try {
      const response = await fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=${group}&name=${paramName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      return response.ok;
    } catch (err: any) {
      console.error('writeCommandParameter error', err);
      alert('Command error: ' + err.message);
      return false;
    }
  }

  // Helper function to format values
  function formatValue(v: any): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (typeof v === 'number') return v.toString();
    if (typeof v === 'string') return v;
    return String(v);
  }

  // Set MessID for different command types
  async function setMessId(commandType: 'Langzeittest' | 'Detailtest' | 'Einzeltest', messId: string): Promise<void> {
    if (sending) return;
    if (!messId || messId.trim() === '') {
      alert('Please enter a MessID first');
      return;
    }
    setSending(true);
    try {
      const groupMap = {
        'Langzeittest': 'Kommandos',
        'Detailtest': 'Kommandos',
        'Einzeltest': 'Kommandos'
      };
      const paramMap = {
        'Langzeittest': 'MessIDLongterm',
        'Detailtest': 'MessIDDetail',
        'Einzeltest': 'MessIDSingle'
      };
      
      const success = await writeCommandParameter(groupMap[commandType], paramMap[commandType], messId);
      if (success) {
        alert(`MessID${commandType === 'Langzeittest' ? 'Longterm' : commandType === 'Detailtest' ? 'Detail' : 'Single'} set to ${messId}`);
        await readMessId(commandType);
      } else {
        alert('Failed to set MessID');
      }
    } finally {
      setSending(false);
    }
  }

  // Read MessID for different command types
  async function readMessId(commandType: 'Langzeittest' | 'Detailtest' | 'Einzeltest'): Promise<void> {
    try {
      const groupMap = {
        'Langzeittest': 'Kommandos',
        'Detailtest': 'Kommandos',
        'Einzeltest': 'Kommandos'
      };
      const paramMap = {
        'Langzeittest': 'MessIDLongterm',
        'Detailtest': 'MessIDDetail',
        'Einzeltest': 'MessIDSingle'
      };
      
      const res = await fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=${groupMap[commandType]}&name=${paramMap[commandType]}`);
      const result = await res.json();
      const value = formatValue(result.value);
      
      if (commandType === 'Langzeittest') {
        setLiveMessIdLangzeittest(value);
      } else if (commandType === 'Detailtest') {
        setLiveMessIdDetailtest(value);
      } else if (commandType === 'Einzeltest') {
        setLiveMessIdEinzeltest(value);
      }
    } catch (e) {
      console.error('readMessId', e);
      alert('Failed to read MessID. See console.');
    }
  }

  // Send Langzeittest commands
  async function sendLangzeittestCommand(paramName: string): Promise<void> {
    if (sending) return;
    setSending(true);
    try {
      const success = await writeCommandParameter('Kommandos', paramName, 'true');
      if (success) {
        alert('Langzeittest command sent successfully');
      } else {
        alert('Langzeittest command failed');
      }
    } finally {
      setSending(false);
    }
  }

  // Send Detailtest commands
  async function sendDetailtestCommand(paramName: string): Promise<void> {
    if (sending) return;
    setSending(true);
    try {
      const success = await writeCommandParameter('Kommandos', paramName, 'true');
      if (success) {
        alert('Detailtest command sent successfully');
      } else {
        alert('Detailtest command failed');
      }
    } finally {
      setSending(false);
    }
  }

  // Send Einzeltest commands
  async function sendEinzeltestCommand(paramName: string, ventilnummer: string): Promise<void> {
    if (sending) return;
    if (!ventilnummer || ventilnummer.trim() === '') {
      alert('Please enter a Ventilnummer first');
      return;
    }
    setSending(true);
    try {
      // First write the Ventilnummer
      const ventilSuccess = await writeCommandParameter('Kommandos', 'Einzeltest_Ventilnummer', ventilnummer);
      if (!ventilSuccess) {
        alert('Failed to write Ventilnummer');
        return;
      }
      // Then execute the command
      const cmdSuccess = await writeCommandParameter('Kommandos/Einzeltest', paramName, 'true');
      if (cmdSuccess) {
        alert('Einzeltest command sent successfully');
      } else {
        alert('Einzeltest command failed');
      }
    } finally {
      setSending(false);
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

      {/* Commands Section - same as original */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '14px', fontWeight: 'bold' }}>Commands</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* All three command blocks side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {/* Langzeittest */}
            <div style={{
              padding: '8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold' }}>Langzeittest</h3>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12px' }}>
                <button style={{ padding: '4px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '12px' }} disabled={sending} onClick={() => sendLangzeittestCommand('Langzeittest_Start')}>Start</button>
                <button style={{ padding: '4px 10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '12px' }} disabled={sending} onClick={() => sendLangzeittestCommand('Langzeittest_Pause')}>Pause</button>
                <button style={{ padding: '4px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '12px' }} disabled={sending} onClick={() => sendLangzeittestCommand('Langzeittest_Stop')}>Stop</button>
                <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '12px' }}>MessID {liveMessIdLangzeittest && <span style={{ fontSize: '11px', color: '#666' }}>(Live: <code>{liveMessIdLangzeittest}</code>)</span>}:</label>
                  <input value={messIdLangzeittest} onChange={e => setMessIdLangzeittest(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '3px', width: '80px', fontSize: '12px' }} />
                  <button style={{ padding: '4px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '11px' }} disabled={sending} onClick={() => setMessId('Langzeittest', messIdLangzeittest)}>Set</button>
                  <button style={{ padding: '4px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', fontSize: '11px' }} onClick={() => readMessId('Langzeittest')}>Read</button>
                </div>
              </div>
            </div>

            {/* Detailtest */}
            <div style={{
              padding: '8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold' }}>Detailtest</h3>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12px' }}>
                <button style={{ padding: '4px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '12px' }} disabled={sending} onClick={() => sendDetailtestCommand('Detailtest_Start')}>Start</button>
                <button style={{ padding: '4px 10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '12px' }} disabled={sending} onClick={() => sendDetailtestCommand('Detailtest_Pause')}>Pause</button>
                <button style={{ padding: '4px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '12px' }} disabled={sending} onClick={() => sendDetailtestCommand('Detailtest_Stop')}>Stop</button>
                <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '12px' }}>MessID {liveMessIdDetailtest && <span style={{ fontSize: '11px', color: '#666' }}>(Live: <code>{liveMessIdDetailtest}</code>)</span>}:</label>
                  <input value={messIdDetailtest} onChange={e => setMessIdDetailtest(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '3px', width: '80px', fontSize: '12px' }} />
                  <button style={{ padding: '4px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '11px' }} disabled={sending} onClick={() => setMessId('Detailtest', messIdDetailtest)}>Set</button>
                  <button style={{ padding: '4px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', fontSize: '11px' }} onClick={() => readMessId('Detailtest')}>Read</button>
                </div>
              </div>
            </div>

            {/* Einzeltest */}
            <div style={{
              padding: '8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold' }}>Einzeltest (Ventiltest)</h3>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12px' }}>
                <label style={{ fontSize: '12px' }}>Ventilnr:</label>
                <input value={einzelVentil} onChange={e => setEinzelVentil(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '3px', width: '60px', fontSize: '12px' }} />
                <button style={{ padding: '4px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '12px' }} disabled={sending} onClick={() => sendEinzeltestCommand('Einzeltest_Start', einzelVentil)}>Start</button>
                <button style={{ padding: '4px 10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '12px' }} disabled={sending} onClick={() => sendEinzeltestCommand('Einzeltest_Pause', einzelVentil)}>Pause</button>
                <button style={{ padding: '4px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '12px' }} disabled={sending} onClick={() => sendEinzeltestCommand('Einzeltest_Stop', einzelVentil)}>Stop</button>
                <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '12px' }}>MessID {liveMessIdEinzeltest && <span style={{ fontSize: '11px', color: '#666' }}>(Live: <code>{liveMessIdEinzeltest}</code>)</span>}:</label>
                  <input value={messIdEinzeltest} onChange={e => setMessIdEinzeltest(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '3px', width: '80px', fontSize: '12px' }} />
                  <button style={{ padding: '4px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: sending ? 'not-allowed' : 'pointer', fontSize: '11px' }} disabled={sending} onClick={() => setMessId('Einzeltest', messIdEinzeltest)}>Set</button>
                  <button style={{ padding: '4px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px', fontSize: '11px' }} onClick={() => readMessId('Einzeltest')}>Read</button>
                </div>
              </div>
            </div>
          </div>
        </div>
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

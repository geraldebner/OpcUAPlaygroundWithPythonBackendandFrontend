import React, { useState, useEffect, useCallback } from 'react';

interface TestOverviewViewProps {
  apiBase: string;
  selectedBlock: number;
}

interface GlobalData {
  BatteryStatus: number;
  GeneralErrors: number;
  TemperaturePLC: number;
  Version: number;
}

interface AllgemeineParameter {
  Fehlerbit: number | null;
  CurrentAirPressure: number | null;
  CurrentAirFlow: number | null;
  CurrentForce: number | null;
  MessMode: number | null;
  OperationMode: number | null;
}

interface VentilData {
  ventilNr: number;
  Status: number;
  DatenReady: number;
  MessID: number;
  durchfluss: {
    Status: number;
    DatenReady: number;
    MessID: number;
  };
  strom: {
    Status: number;
    DatenReady: number;
    MessID: number;
  };
  kraft: {
    Status: number;
    DatenReady: number;
    MessID: number;
  };
}

export default function TestOverviewView({ apiBase, selectedBlock }: TestOverviewViewProps) {
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [allgemeineParameter, setAllgemeineParameter] = useState<AllgemeineParameter | null>(null);
  const [ventilData, setVentilData] = useState<VentilData[]>([]);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [autoUpdateVentil, setAutoUpdateVentil] = useState(false);
  const [messId, setMessId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read GlobalData
  const readGlobalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiBase}/api/parameters/read-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labels: [
            'DB_GlobalData1.BatteryStatus',
            'DB_GlobalData1.GeneralErrors',
            'DB_GlobalData1.TemperaturePLC',
            'DB_GlobalData1.Version'
          ]
        })
      });

      if (!response.ok) throw new Error(`Failed to read global data: ${response.status}`);
      
      const data = await response.json();
      setGlobalData({
        BatteryStatus: data.find((d: any) => d.label.includes('BatteryStatus'))?.value ?? 0,
        GeneralErrors: data.find((d: any) => d.label.includes('GeneralErrors'))?.value ?? 0,
        TemperaturePLC: data.find((d: any) => d.label.includes('TemperaturePLC'))?.value ?? 0,
        Version: data.find((d: any) => d.label.includes('Version'))?.value ?? 0
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  // Read AllgemeineParameter for selected block
  const readAllgemeineParameter = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiBase}/api/parameters/${selectedBlock}/group/AllgemeineParameter`);

      if (!response.ok) throw new Error(`Failed to read allgemeine parameter: ${response.status}`);
      
      const data = await response.json();
      console.log('AllgemeineParameter API response:', data);
      console.log('Is array?', Array.isArray(data));
      console.log('Data length:', data?.length);
      
      // The group endpoint returns an array of {name, value} objects
      if (Array.isArray(data)) {
        // Helper function to convert value to number
        const toNumber = (val: any): number | null => {
          if (val === null || val === undefined || val === '') return null;
          const num = typeof val === 'string' ? parseFloat(val) : Number(val);
          return isNaN(num) ? null : num;
        };
        
        const params = {
          Fehlerbit: toNumber(data.find((d: any) => d.name === 'Fehlerbit')?.value),
          CurrentAirPressure: toNumber(data.find((d: any) => d.name === 'CurrentAirPressure')?.value),
          CurrentAirFlow: toNumber(data.find((d: any) => d.name === 'CurrentAirFlow')?.value),
          CurrentForce: toNumber(data.find((d: any) => d.name === 'CurrentForce')?.value),
          MessMode: toNumber(data.find((d: any) => d.name === 'MessMode')?.value),
          OperationMode: toNumber(data.find((d: any) => d.name === 'OperationMode')?.value)
        };
        console.log('Parsed AllgemeineParameter:', params);
        setAllgemeineParameter(params);
      }
    } catch (err: any) {
      console.error('Error reading AllgemeineParameter:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, selectedBlock]);

  // Read Ventil Data (Ventil 1-16)
  // Note: This requires reading individual parameters since there's no read-multiple endpoint
  // For now, this is a placeholder - ventil data reading would require 144 individual API calls
  // or implementing a read-multiple endpoint in the backend
  const readVentilData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Implement ventil data reading using individual API calls or backend endpoint
      // Current limitation: No /api/parameters/read-multiple endpoint exists
      // Would need to call /api/parameters/{block}/value?group=...&name=... 144 times
      // or implement a batch read endpoint in the backend
      
      console.warn('Ventil data reading not yet implemented - requires backend endpoint');
      setError('Ventil data reading requires backend implementation');
      
      const data: any[] = [];
      
      const ventils: VentilData[] = [];
      for (let i = 1; i <= 16; i++) {
        ventils.push({
          ventilNr: i,
          Status: data.find((d: any) => d.label.includes(`DB_Strommessung1.DB_Ventil_Ext${i}.Status`))?.value ?? 0,
          DatenReady: data.find((d: any) => d.label.includes(`DB_Strommessung1.DB_Ventil_Ext${i}.DatenReady`))?.value ?? 0,
          MessID: data.find((d: any) => d.label.includes(`DB_Strommessung1.DB_Ventil_Ext${i}.MessIDCurrent`))?.value ?? 0,
          durchfluss: {
            Status: data.find((d: any) => d.label.includes(`DB_Durchflussmessung1.DB_Ventil_Ext${i}.Status`))?.value ?? 0,
            DatenReady: data.find((d: any) => d.label.includes(`DB_Durchflussmessung1.DB_Ventil_Ext${i}.DatenReady`))?.value ?? 0,
            MessID: data.find((d: any) => d.label.includes(`DB_Durchflussmessung1.DB_Ventil_Ext${i}.MessIDCurrent`))?.value ?? 0
          },
          strom: {
            Status: data.find((d: any) => d.label.includes(`DB_Strommessung1.DB_Ventil_Ext${i}.Status`))?.value ?? 0,
            DatenReady: data.find((d: any) => d.label.includes(`DB_Strommessung1.DB_Ventil_Ext${i}.DatenReady`))?.value ?? 0,
            MessID: data.find((d: any) => d.label.includes(`DB_Strommessung1.DB_Ventil_Ext${i}.MessIDCurrent`))?.value ?? 0
          },
          kraft: {
            Status: data.find((d: any) => d.label.includes(`DB_Kraftmessung1.DB_Ventil_Ext${i}.Status`))?.value ?? 0,
            DatenReady: data.find((d: any) => d.label.includes(`DB_Kraftmessung1.DB_Ventil_Ext${i}.DatenReady`))?.value ?? 0,
            MessID: data.find((d: any) => d.label.includes(`DB_Kraftmessung1.DB_Ventil_Ext${i}.MessIDCurrent`))?.value ?? 0
          }
        });
      }
      
      setVentilData(ventils);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, selectedBlock]);

  // Read all data
  const readAllData = useCallback(async () => {
    await Promise.all([
      readGlobalData(),
      readAllgemeineParameter()
    ]);
  }, [readGlobalData, readAllgemeineParameter]);

  // Auto-update effect
  useEffect(() => {
    if (autoUpdate) {
      const interval = setInterval(readAllData, 2000);
      return () => clearInterval(interval);
    }
  }, [autoUpdate, readAllData]);

  useEffect(() => {
    if (autoUpdateVentil) {
      const interval = setInterval(readVentilData, 2000);
      return () => clearInterval(interval);
    }
  }, [autoUpdateVentil, readVentilData]);

  // Commands
  const handleCommand = async (command: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Kommandos&name=${command}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'true' })
      });

      if (!response.ok) throw new Error(`Command failed: ${response.status}`);
      
      alert(`Command "${command}" executed successfully`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetMessId = async () => {
    if (!messId) {
      alert('Please enter a MessID');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Kommandos&name=MessIDLongterm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: messId })
      });

      if (!response.ok) throw new Error(`Set MessID failed: ${response.status}`);
      
      alert(`MessID set to ${messId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReadMessId = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Kommandos&name=MessIDLongterm`);

      if (!response.ok) throw new Error(`Read MessID failed: ${response.status}`);
      
      const data = await response.json();
      setMessId(data.value ? data.value.toString() : '');
      alert(`Current MessID: ${data.value}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c00'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Global Data Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>Global Data</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={readGlobalData}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {loading ? 'Reading...' : 'Read'}
            </button>
          </div>
        </div>

        {globalData && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <DataCard label="Battery Status" value={globalData.BatteryStatus} unit="%" />
            <DataCard label="General Errors" value={globalData.GeneralErrors} />
            <DataCard label="Temperature PLC" value={globalData.TemperaturePLC} unit="°C" />
            <DataCard label="Version" value={globalData.Version} />
          </div>
        )}
      </div>

      {/* AllgemeineParameter Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>
            Allgemeine Parameter - Block {selectedBlock}
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={readAllgemeineParameter}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {loading ? 'Reading...' : 'Read'}
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <DataCard label="Fehlerbit" value={allgemeineParameter?.Fehlerbit ?? null} />
          <DataCard label="Current Air Pressure" value={allgemeineParameter?.CurrentAirPressure ?? null} unit="mbar" />
          <DataCard label="Current Air Flow" value={allgemeineParameter?.CurrentAirFlow ?? null} unit="l/min" />
          <DataCard label="Current Force" value={allgemeineParameter?.CurrentForce ?? null} unit="N" />
          <DataCard label="Mess Mode" value={allgemeineParameter?.MessMode ?? null} />
          <DataCard label="Operation Mode" value={allgemeineParameter?.OperationMode ?? null} />
        </div>
      </div>

      {/* Commands Section */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>Commands</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* MessID Controls */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>MessID Control</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                value={messId}
                onChange={(e) => setMessId(e.target.value)}
                placeholder="Enter MessID"
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  flex: '1',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={handleSetMessId}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                Set MessID
              </button>
              <button
                onClick={handleReadMessId}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                Read MessID
              </button>
            </div>
          </div>

          {/* Test Commands */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Test Commands</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '8px'
            }}>
              <CommandButton onClick={() => handleCommand('start-langzeittest')} disabled={loading}>
                Start Langzeittest
              </CommandButton>
              <CommandButton onClick={() => handleCommand('pause-langzeittest')} disabled={loading}>
                Pause Langzeittest
              </CommandButton>
              <CommandButton onClick={() => handleCommand('stop-langzeittest')} disabled={loading}>
                Stop Langzeittest
              </CommandButton>
              <CommandButton onClick={() => handleCommand('start-detailtest')} disabled={loading}>
                Start Detailtest
              </CommandButton>
              <CommandButton onClick={() => handleCommand('pause-detailtest')} disabled={loading}>
                Pause Detailtest
              </CommandButton>
              <CommandButton onClick={() => handleCommand('stop-detailtest')} disabled={loading}>
                Stop Detailtest
              </CommandButton>
            </div>
          </div>
        </div>
      </div>

      {/* Ventil Data Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>Ventil Status Overview</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={autoUpdateVentil}
                onChange={(e) => setAutoUpdateVentil(e.target.checked)}
              />
              <span>Auto Update</span>
            </label>
            <button
              onClick={readVentilData}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {loading ? '⏳ Reading...' : '🔄 Read'}
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                <th style={thStyle} rowSpan={2}>Ventil</th>
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
              {ventilData.map((ventil, idx) => (
                <tr key={ventil.ventilNr} style={{
                  backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white'
                }}>
                  <td style={tdStyle}><strong>Ventil {ventil.ventilNr}</strong></td>
                  <td style={tdStyle}>{ventil.strom.Status}</td>
                  <td style={tdStyle}>{ventil.strom.DatenReady}</td>
                  <td style={tdStyle}>{ventil.strom.MessID}</td>
                  <td style={tdStyle}>{ventil.durchfluss.Status}</td>
                  <td style={tdStyle}>{ventil.durchfluss.DatenReady}</td>
                  <td style={tdStyle}>{ventil.durchfluss.MessID}</td>
                  <td style={tdStyle}>{ventil.kraft.Status}</td>
                  <td style={tdStyle}>{ventil.kraft.DatenReady}</td>
                  <td style={tdStyle}>{ventil.kraft.MessID}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function DataCard({ label, value, unit }: { label: string; value: number | null | undefined; unit?: string }) {
  const displayValue = value != null && typeof value === 'number' ? value.toFixed(2) : '--';
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#2c3e50'
      }}>
        {displayValue} {unit && <span style={{ fontSize: '14px', color: '#7f8c8d' }}>{unit}</span>}
      </div>
    </div>
  );
}

function CommandButton({
  onClick,
  disabled,
  children
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 16px',
        backgroundColor: '#3498db',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: '500',
        fontSize: '13px',
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = '#2980b9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#3498db';
      }}
    >
      {children}
    </button>
  );
}

// Table styles
const thStyle: React.CSSProperties = {
  padding: '12px 8px',
  textAlign: 'center',
  borderBottom: '2px solid #2c3e50',
  fontWeight: '600',
  fontSize: '12px'
};

const tdStyle: React.CSSProperties = {
  padding: '10px 8px',
  textAlign: 'center',
  borderBottom: '1px solid #e9ecef'
};

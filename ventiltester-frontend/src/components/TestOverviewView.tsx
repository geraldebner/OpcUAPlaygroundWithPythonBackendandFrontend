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
  Zaehler: number;  // Counter from Daten_Langzeittest
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
  const [autoUpdateAllgemeine, setAutoUpdateAllgemeine] = useState(false);
  const [autoUpdateVentil, setAutoUpdateVentil] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
      
      // Helper function to convert value to number
      const toNumber = (val: any): number => {
        if (val === null || val === undefined || val === '') return 0;
        const num = typeof val === 'string' ? parseFloat(val) : Number(val);
        return isNaN(num) ? 0 : num;
      };
      
      // Read all ventil data by reading individual parameters (faster than reading whole groups with arrays)
      const ventils: VentilData[] = [];
      
      for (let i = 1; i <= 16; i++) {
        try {
          // Read only the specific parameters we need for each ventil (9 parameters + counter)
          const [
            stromStatusRes, stromDatenReadyRes, stromMessIDRes,
            durchflussStatusRes, durchflussDatenReadyRes, durchflussMessIDRes,
            kraftStatusRes, kraftDatenReadyRes, kraftMessIDRes,
            zaehlerRes
          ] = await Promise.all([
            // Strommessung
            fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Daten_Strommessung/Ventil${i}&name=Status`),
            fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Daten_Strommessung/Ventil${i}&name=DatenReady`),
            fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Daten_Strommessung/Ventil${i}&name=MessIDCurrent`),
            // Durchflussmessung
            fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Daten_Durchflussmessung/Ventil${i}&name=Status`),
            fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Daten_Durchflussmessung/Ventil${i}&name=DatenReady`),
            fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Daten_Durchflussmessung/Ventil${i}&name=MessIDCurrent`),
            // Kraftmessung
            fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Daten_Kraftmessung/Ventil${i}&name=Status`),
            fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Daten_Kraftmessung/Ventil${i}&name=DatenReady`),
            fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Daten_Kraftmessung/Ventil${i}&name=MessIDCurrent`),
            // Counter
            fetch(`${apiBase}/api/parameters/${selectedBlock}/value?group=Daten_Langzeittest&name=ZaehlerVentil_${i}`)
          ]);
          
          const [
            stromStatus, stromDatenReady, stromMessID,
            durchflussStatus, durchflussDatenReady, durchflussMessID,
            kraftStatus, kraftDatenReady, kraftMessID,
            zaehler
          ] = await Promise.all([
            stromStatusRes.ok ? stromStatusRes.json() : Promise.resolve({ value: 0 }),
            stromDatenReadyRes.ok ? stromDatenReadyRes.json() : Promise.resolve({ value: 0 }),
            stromMessIDRes.ok ? stromMessIDRes.json() : Promise.resolve({ value: 0 }),
            durchflussStatusRes.ok ? durchflussStatusRes.json() : Promise.resolve({ value: 0 }),
            durchflussDatenReadyRes.ok ? durchflussDatenReadyRes.json() : Promise.resolve({ value: 0 }),
            durchflussMessIDRes.ok ? durchflussMessIDRes.json() : Promise.resolve({ value: 0 }),
            kraftStatusRes.ok ? kraftStatusRes.json() : Promise.resolve({ value: 0 }),
            kraftDatenReadyRes.ok ? kraftDatenReadyRes.json() : Promise.resolve({ value: 0 }),
            kraftMessIDRes.ok ? kraftMessIDRes.json() : Promise.resolve({ value: 0 }),
            zaehlerRes.ok ? zaehlerRes.json() : Promise.resolve({ value: 0 })
          ]);
          
          ventils.push({
            ventilNr: i,
            Status: toNumber(stromStatus.value),
            DatenReady: toNumber(stromDatenReady.value),
            MessID: toNumber(stromMessID.value),
            Zaehler: toNumber(zaehler.value),
            durchfluss: {
              Status: toNumber(durchflussStatus.value),
              DatenReady: toNumber(durchflussDatenReady.value),
              MessID: toNumber(durchflussMessID.value)
            },
            strom: {
              Status: toNumber(stromStatus.value),
              DatenReady: toNumber(stromDatenReady.value),
              MessID: toNumber(stromMessID.value)
            },
            kraft: {
              Status: toNumber(kraftStatus.value),
              DatenReady: toNumber(kraftDatenReady.value),
              MessID: toNumber(kraftMessID.value)
            }
          });
        } catch (err) {
          console.error(`Failed to read ventil ${i}:`, err);
          // Add placeholder data if read fails
          ventils.push({
            ventilNr: i,
            Status: 0,
            DatenReady: 0,
            MessID: 0,
            Zaehler: 0,
            durchfluss: { Status: 0, DatenReady: 0, MessID: 0 },
            strom: { Status: 0, DatenReady: 0, MessID: 0 },
            kraft: { Status: 0, DatenReady: 0, MessID: 0 }
          });
        }
      }
      
      console.log('Final ventil data:', ventils);
      setVentilData(ventils);
    } catch (err: any) {
      console.error('Error reading ventil data:', err);
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
    if (autoUpdateAllgemeine) {
      const interval = setInterval(readAllgemeineParameter, 2000);
      return () => clearInterval(interval);
    }
  }, [autoUpdateAllgemeine, readAllgemeineParameter]);

  useEffect(() => {
    if (autoUpdateVentil) {
      const interval = setInterval(readVentilData, 2000);
      return () => clearInterval(interval);
    }
  }, [autoUpdateVentil, readVentilData]);

  // Commands
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
      const data = await res.json();
      const value = formatValue(data.value);
      
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={autoUpdateAllgemeine}
                onChange={(e) => setAutoUpdateAllgemeine(e.target.checked)}
              />
              <span>Auto Update</span>
            </label>
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
          {/* Langzeittest */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Langzeittest</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => sendLangzeittestCommand('Langzeittest_Start')}>Start</button>
              <button style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '6px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => sendLangzeittestCommand('Langzeittest_Pause')}>Pause</button>
              <button style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => sendLangzeittestCommand('Langzeittest_Stop')}>Stop</button>
              <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px' }}>MessID {liveMessIdLangzeittest && <span style={{ fontSize: '12px', color: '#666' }}>(Live: <code>{liveMessIdLangzeittest}</code>)</span>}:</label>
                <input value={messIdLangzeittest} onChange={e => setMessIdLangzeittest(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', width: '100px' }} />
                <button style={{ padding: '6px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => setMessId('Langzeittest', messIdLangzeittest)}>Set MessID</button>
                <button style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }} onClick={() => readMessId('Langzeittest')}>Read MessID</button>
              </div>
            </div>
          </div>

          {/* Detailtest */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Detailtest</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => sendDetailtestCommand('Detailtest_Start')}>Start</button>
              <button style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '6px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => sendDetailtestCommand('Detailtest_Pause')}>Pause</button>
              <button style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => sendDetailtestCommand('Detailtest_Stop')}>Stop</button>
              <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px' }}>MessID {liveMessIdDetailtest && <span style={{ fontSize: '12px', color: '#666' }}>(Live: <code>{liveMessIdDetailtest}</code>)</span>}:</label>
                <input value={messIdDetailtest} onChange={e => setMessIdDetailtest(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', width: '100px' }} />
                <button style={{ padding: '6px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => setMessId('Detailtest', messIdDetailtest)}>Set MessID</button>
                <button style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }} onClick={() => readMessId('Detailtest')}>Read MessID</button>
              </div>
            </div>
          </div>

          {/* Einzeltest (Ventiltest) */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Einzeltest (Ventiltest)</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '14px' }}>Ventilnummer:</label>
              <input value={einzelVentil} onChange={e => setEinzelVentil(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', width: '100px' }} />
              <button style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => sendEinzeltestCommand('Einzeltest_Start', einzelVentil)}>Start</button>
              <button style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '6px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => sendEinzeltestCommand('Einzeltest_Pause', einzelVentil)}>Pause</button>
              <button style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => sendEinzeltestCommand('Einzeltest_Stop', einzelVentil)}>Stop</button>
              <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px' }}>MessID {liveMessIdEinzeltest && <span style={{ fontSize: '12px', color: '#666' }}>(Live: <code>{liveMessIdEinzeltest}</code>)</span>}:</label>
                <input value={messIdEinzeltest} onChange={e => setMessIdEinzeltest(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', width: '100px' }} />
                <button style={{ padding: '6px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: sending ? 'not-allowed' : 'pointer' }} disabled={sending} onClick={() => setMessId('Einzeltest', messIdEinzeltest)}>Set MessID</button>
                <button style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }} onClick={() => readMessId('Einzeltest')}>Read MessID</button>
              </div>
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
              {ventilData.map((ventil, idx) => (
                <tr key={ventil.ventilNr} style={{
                  backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white'
                }}>
                  <td style={tdStyle}><strong>Ventil {ventil.ventilNr}</strong></td>
                  <td style={tdStyle}><strong>{ventil.Zaehler}</strong></td>
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

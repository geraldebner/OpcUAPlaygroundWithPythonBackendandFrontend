import React, { useState, useCallback } from 'react';

interface CommandsPanelProps {
  apiBase: string;
  selectedBlock: number | null;
  compact?: boolean; // If true, use compact styling like in TestOverview
}

export default function CommandsPanel({ apiBase, selectedBlock, compact = false }: CommandsPanelProps) {
  // If no block is selected, show a message
  if (selectedBlock === null) {
    return <div style={{ padding: '16px', color: '#666' }}>Please select a block first.</div>;
  }
  const [sending, setSending] = useState<boolean>(false);
  const [einzelVentil, setEinzelVentil] = useState<string>('');
  
  // MessID state for each command type
  const [messIdLangzeittest, setMessIdLangzeittest] = useState<string>('');
  const [messIdDetailtest, setMessIdDetailtest] = useState<string>('');
  const [messIdEinzeltest, setMessIdEinzeltest] = useState<string>('');
  
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

  if (compact) {
    // Compact view for TestOverview
    return (
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
    );
  }

  // Regular view for CommandsMeasurementsView
  return (
    <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
      <div>
        <b>Langzeittest</b>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => sendLangzeittestCommand('Langzeittest_Start')}>Start</button>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => sendLangzeittestCommand('Langzeittest_Stop')}>Stop</button>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => sendLangzeittestCommand('Langzeittest_Pause')}>Pause</button>
        <label style={{ marginLeft: 16 }}>MessID {liveMessIdLangzeittest && <span style={{ fontSize: 12, color: '#666' }}>(Live: <code>{liveMessIdLangzeittest}</code>)</span>}: <input value={messIdLangzeittest} onChange={e => setMessIdLangzeittest(e.target.value)} style={{ marginLeft: 8, width: '100px' }} /></label>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => setMessId('Langzeittest', messIdLangzeittest)}>Set MessID</button>
        <button style={{ marginLeft: 8 }} onClick={() => readMessId('Langzeittest')}>Read MessID</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <b>Detailtest</b>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => sendDetailtestCommand('Detailtest_Start')}>Start</button>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => sendDetailtestCommand('Detailtest_Stop')}>Stop</button>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => sendDetailtestCommand('Detailtest_Pause')}>Pause</button>
        <label style={{ marginLeft: 16 }}>MessID {liveMessIdDetailtest && <span style={{ fontSize: 12, color: '#666' }}>(Live: <code>{liveMessIdDetailtest}</code>)</span>}: <input value={messIdDetailtest} onChange={e => setMessIdDetailtest(e.target.value)} style={{ marginLeft: 8, width: '100px' }} /></label>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => setMessId('Detailtest', messIdDetailtest)}>Set MessID</button>
        <button style={{ marginLeft: 8 }} onClick={() => readMessId('Detailtest')}>Read MessID</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <b>Einzeltest</b>
        <label style={{ marginLeft: 8 }}>Ventilnummer: <input value={einzelVentil} onChange={e => setEinzelVentil(e.target.value)} style={{ marginLeft: 8, width: '100px' }} /></label>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => sendEinzeltestCommand('Einzeltest_Start', einzelVentil)}>Start</button>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => sendEinzeltestCommand('Einzeltest_Stop', einzelVentil)}>Stop</button>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => sendEinzeltestCommand('Einzeltest_Pause', einzelVentil)}>Pause</button>
        <label style={{ marginLeft: 16 }}>MessID {liveMessIdEinzeltest && <span style={{ fontSize: 12, color: '#666' }}>(Live: <code>{liveMessIdEinzeltest}</code>)</span>}: <input value={messIdEinzeltest} onChange={e => setMessIdEinzeltest(e.target.value)} style={{ marginLeft: 8, width: '100px' }} /></label>
        <button style={{ marginLeft: 8 }} disabled={sending} onClick={() => setMessId('Einzeltest', messIdEinzeltest)}>Set MessID</button>
        <button style={{ marginLeft: 8 }} onClick={() => readMessId('Einzeltest')}>Read MessID</button>
      </div>
    </div>
  );
}

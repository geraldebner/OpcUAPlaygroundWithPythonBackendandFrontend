import React, { useState } from 'react';
import axios from 'axios';

export default function CommandsMeasurementsView({ apiBase, selectedBlock }) {
  const [sending, setSending] = useState(false);
  const [measurements, setMeasurements] = useState({});
  const [ltData, setLtData] = useState(null);
  const [einzelVentil, setEinzelVentil] = useState('');

  async function pingServer() {
    try {
      await axios.get(`${apiBase}/api/commands/ping`);
      return true;
    } catch (e) {
      console.warn('Ping failed', e);
      return false;
    }
  }

  async function sendCommand(params) {
    if (sending) return;
    setSending(true);
    try {
      const alive = await pingServer();
      if (!alive) {
        alert('Backend unreachable (ping failed).');
        return;
      }
      const res = await axios.post(`${apiBase}/api/commands`, null, { params });
      if (res.status >= 200 && res.status < 300) {
        alert('Command sent successfully');
      } else {
        alert('Command failed: ' + res.status);
      }
    } catch (err) {
      console.error('sendCommand error', err);
      const msg = err?.response?.data ?? err.message ?? String(err);
      alert('Command error: ' + msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="actions">
        <div style={{display:'flex',gap:8,flexDirection:'column'}}>
          <div>
            <b>Langzeittest</b>
            <button style={{marginLeft:8}} disabled={sending} onClick={() => sendCommand({ index: selectedBlock, testType: 'Langzeittest', action: 'Start' })}>Start</button>
            <button style={{marginLeft:8}} disabled={sending} onClick={() => sendCommand({ index: selectedBlock, testType: 'Langzeittest', action: 'Stop' })}>Stop</button>
            <button style={{marginLeft:8}} disabled={sending} onClick={() => sendCommand({ index: selectedBlock, testType: 'Langzeittest', action: 'Pause' })}>Pause</button>
          </div>
          <div style={{marginTop:8}}>
            <b>Detailtest</b>
            <button style={{marginLeft:8}} disabled={sending} onClick={() => sendCommand({ index: selectedBlock, testType: 'Detailtest', action: 'Start' })}>Start</button>
            <button style={{marginLeft:8}} disabled={sending} onClick={() => sendCommand({ index: selectedBlock, testType: 'Detailtest', action: 'Stop' })}>Stop</button>
            <button style={{marginLeft:8}} disabled={sending} onClick={() => sendCommand({ index: selectedBlock, testType: 'Detailtest', action: 'Pause' })}>Pause</button>
          </div>
          <div style={{marginTop:8}}>
            <b>Einzeltest</b>
            <label style={{marginLeft:8}}>Ventilnummer: <input value={einzelVentil} onChange={e=>setEinzelVentil(e.target.value)} style={{marginLeft:8}} /></label>
            <button style={{marginLeft:8}} disabled={sending} onClick={() => sendCommand({ index: selectedBlock, testType: 'Einzeltest', action: 'Start', value: einzelVentil })}>Start</button>
            <button style={{marginLeft:8}} disabled={sending} onClick={() => sendCommand({ index: selectedBlock, testType: 'Einzeltest', action: 'Stop', value: einzelVentil })}>Stop</button>
            <button style={{marginLeft:8}} disabled={sending} onClick={() => sendCommand({ index: selectedBlock, testType: 'Einzeltest', action: 'Pause', value: einzelVentil })}>Pause</button>
          </div>
        </div>
      </div>

      <div style={{borderTop:'1px solid #ddd', marginTop:12, paddingTop:12}}>
        <h4>Measurements</h4>
        <div style={{display:'flex',gap:8,flexDirection:'row',alignItems:'center'}}>
          <button onClick={async ()=>{ const res = await axios.get(`${apiBase}/api/langzeittest/${selectedBlock}`); setLtData(res.data); }}>Refresh Langzeittest</button>
          <button onClick={async ()=>{ const res = await axios.get(`${apiBase}/api/strommessung/status/${selectedBlock}`); setMeasurements(prev=>({ ...prev, status: res.data })); }}>Block Status</button>
          <button onClick={async ()=>{ const res = await axios.get(`${apiBase}/api/strommessung/status`); setMeasurements(prev=>({ ...prev, allStatus: res.data })); }}>All Status</button>
          <button onClick={async ()=>{ const res = await axios.get(`${apiBase}/api/strommessung/block/${selectedBlock}`); setMeasurements(prev=>({ ...prev, block: res.data })); }}>Block Data</button>
          <button onClick={async ()=>{ const res = await axios.get(`${apiBase}/api/strommessung/all`); setMeasurements(prev=>({ ...prev, all: res.data })); }}>All Data</button>
        </div>

        {ltData && ltData.blockIndex === selectedBlock && (
          <div style={{padding:8}}>
            <h4>Langzeittest - Ventils</h4>
            <ul>
              {ltData.ventils.map(v => <li key={v.index}>#{v.index} {v.name}: {v.value}</li>)}
            </ul>
          </div>
        )}

        <div style={{padding:8}}>
          {measurements.status && (
            <div>
              <h4>Block Status</h4>
              <div>Block {measurements.status.blockIndex}: Status={measurements.status.status} DatenReady={String(measurements.status.datenReady)}</div>
            </div>
          )}
          {measurements.allStatus && (
            <div>
              <h4>All Status</h4>
              <ul>
                {measurements.allStatus.map(s => <li key={s.blockIndex}>Block {s.blockIndex}: {s.status} (DatenReady={String(s.datenReady)})</li>)}
              </ul>
            </div>
          )}
          {measurements.block && (
            <div>
              <h4>Block Data</h4>
              <ul>
                {measurements.block.ventils.map(v => <li key={v.index}>#{v.index} {v.name}: {v.value}</li>)}
              </ul>
            </div>
          )}
          {measurements.all && (
            <div>
              <h4>All Blocks</h4>
              {measurements.all.map(b => (
                <div key={b.blockIndex} style={{marginBottom:8}}>
                  <b>Block {b.blockIndex}</b>
                  <ul>
                    {b.ventils.map(v => <li key={v.index}>#{v.index} {v.name}: {v.value}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

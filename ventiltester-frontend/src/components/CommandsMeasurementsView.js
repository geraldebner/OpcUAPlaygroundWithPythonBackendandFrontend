import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CommandsMeasurementsView({ apiBase, selectedBlock }) {
  const [sending, setSending] = useState(false);
  const [measurements, setMeasurements] = useState({});
  const [ltData, setLtData] = useState(null);
  const [einzelVentil, setEinzelVentil] = useState('');
  const [liveData, setLiveData] = useState(null);

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

  async function fetchLiveData() {
    try {
      const res = await axios.get(`${apiBase}/api/parameters`);
      const data = res.data || [];
      const block = data.find(b => b.index === selectedBlock) || null;
      setLiveData(block);
    } catch (e) {
      console.error('fetchLiveData', e);
    }
  }

  useEffect(() => {
    // load live data when component mounts or selectedBlock changes
    fetchLiveData();
  }, [selectedBlock]);

  async function readSingleParameter(group, name) {
    try {
      const res = await axios.get(`${apiBase}/api/parameters/${selectedBlock}/value`, { params: { group, name } });
      const p = res.data;
      // update liveData locally
      setLiveData(prev => {
        if (!prev) return prev;
        const g = { ...(prev.groups || {}) };
        if (!g[group]) return prev;
        const list = g[group].map(item => item.name === p.name ? { ...item, value: p.value } : item);
        g[group] = list;
        return { ...prev, groups: g };
      });
    } catch (e) {
      console.error('readSingleParameter', e);
      alert('Read failed. See console.');
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
        <div style={{borderTop:'1px solid #eee', marginTop:12, paddingTop:12}}>
          <h4>Live Data (Daten / Kommando groups)</h4>
          <div style={{marginBottom:8}}>
            <button onClick={fetchLiveData}>Refresh Live Data</button>
          </div>
          {liveData && liveData.groups && (
            Object.keys(liveData.groups).filter(g => {
              const n = (g||'').toLowerCase();
              return n.includes('daten') || n.includes('strom') || n.includes('kommand');
            }).map(g => (
              <div key={g} className="group-card">
                <h4>{g}</h4>
                <table className="param-table">
                  <tbody>
                    {liveData.groups[g].map((p, i) => (
                      <tr key={p.name}>
                        <td className="param-name">{p.name}</td>
                        <td style={{fontSize:12,color:'#333'}}>Live: <code>{String(p.value)}</code></td>
                        <td>
                          <button onClick={() => readSingleParameter(g, p.name)}>Read</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

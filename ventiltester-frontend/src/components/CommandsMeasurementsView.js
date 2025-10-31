import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CommandsMeasurementsView({ apiBase, selectedBlock }) {
  function formatValue(v) {
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
  const [sending, setSending] = useState(false);
  const [measurements, setMeasurements] = useState({});
  const [ltData, setLtData] = useState(null);
  const [einzelVentil, setEinzelVentil] = useState('');
  const [liveData, setLiveData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotName, setSnapshotName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalJson, setModalJson] = useState('');
  const [modalTitle, setModalTitle] = useState('');

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
  // DEV-TRACE: log when CommandsMeasurementsView requests parameter list
  console.debug('[API CALL] CommandsMeasurementsView -> GET /api/parameters');
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

  async function listSnapshots() {
    try {
      const res = await axios.get(`${apiBase}/api/measurementsets`, { params: { blockIndex: selectedBlock } });
      setSnapshots(res.data || []);
    } catch (e) {
      console.error('listSnapshots', e);
      alert('Failed to list snapshots');
    }
  }

  async function saveSnapshot() {
    try {
      const payloadObj = measurements.block || liveData || {};
      if (!payloadObj || Object.keys(payloadObj).length === 0) {
        alert('No block data available to save. Refresh Block Data or Live Data first.');
        return;
      }
      const body = {
        name: snapshotName && snapshotName.length ? snapshotName : `Snapshot ${new Date().toISOString()}`,
        blockIndex: selectedBlock,
        jsonPayload: JSON.stringify(payloadObj),
      };
      const res = await axios.post(`${apiBase}/api/measurementsets`, body);
      if (res.status >= 200 && res.status < 300) {
        alert('Snapshot saved');
        setSnapshotName('');
        listSnapshots();
      } else {
        alert('Save failed: ' + res.status);
      }
    } catch (e) {
      console.error('saveSnapshot', e);
      alert('Save snapshot failed');
    }
  }

  async function loadSnapshot(id) {
    try {
      const res = await axios.get(`${apiBase}/api/measurementsets/${id}`);
      const payload = res.data?.payload;
      if (!payload) {
        alert('Snapshot has no payload');
        return;
      }
      let obj = null;
      try { obj = JSON.parse(payload); } catch { obj = payload; }
      // If the payload contains ventils or block-like structure, set it to measurements.block for preview
      setMeasurements(prev => ({ ...prev, block: obj }));
      alert('Snapshot loaded into Block Data preview');
    } catch (e) {
      console.error('loadSnapshot', e);
      alert('Load snapshot failed');
    }
  }

  async function previewSnapshot(id, name) {
    try {
      const res = await axios.get(`${apiBase}/api/measurementsets/${id}`);
      const payload = res.data?.payload;
      if (!payload) { alert('Snapshot has no payload'); return; }
      let pretty = payload;
      try { pretty = JSON.stringify(JSON.parse(payload), null, 2); } catch { /* keep as-is */ }
      setModalTitle(name || `Snapshot ${id}`);
      setModalJson(pretty);
      setShowModal(true);
    } catch (e) {
      console.error('previewSnapshot', e);
      alert('Preview failed');
    }
  }

  async function restoreSnapshot(id) {
    if (!confirm('Restore this snapshot to the device? This will write values to the OPC UA server.')) return;
    try {
      const res = await axios.post(`${apiBase}/api/measurementsets/${id}/restore`);
      if (res.status >= 200 && res.status < 300) {
        alert('Snapshot restored to device');
        // optional: refresh live data
        fetchLiveData();
      } else {
        alert('Restore failed: ' + res.status);
      }
    } catch (e) {
      console.error('restoreSnapshot', e);
      const msg = e?.response?.data ?? e.message ?? String(e);
      alert('Restore error: ' + JSON.stringify(msg));
    }
  }

  async function deleteSnapshot(id) {
    if (!confirm('Delete snapshot?')) return;
    try {
      await axios.delete(`${apiBase}/api/measurementsets/${id}`);
      listSnapshots();
    } catch (e) {
      console.error('deleteSnapshot', e);
      alert('Delete failed');
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
          {showModal && (
            <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
              <div style={{background:'#fff',padding:16,width:'80%',height:'80%',overflow:'auto',boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <h4 style={{margin:0}}>{modalTitle}</h4>
                  <button onClick={()=>setShowModal(false)}>Close</button>
                </div>
                <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',fontSize:12}}>{modalJson}</pre>
              </div>
            </div>
          )}
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

        <div style={{marginTop:10, padding:8, borderTop:'1px dashed #ccc'}}>
          <h5>Snapshots</h5>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input placeholder="Snapshot name" value={snapshotName} onChange={e=>setSnapshotName(e.target.value)} />
            <button onClick={saveSnapshot}>Save Snapshot</button>
            <button onClick={listSnapshots}>List Snapshots</button>
          </div>
          <div style={{marginTop:8}}>
            {snapshots.length === 0 && <div style={{fontSize:12,color:'#666'}}>No snapshots. Click "List Snapshots" to refresh.</div>}
            {snapshots.map(s => (
              <div key={s.id} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderBottom:'1px solid #eee'}}>
                <div style={{flex:1}}><b>{s.name}</b> <span style={{color:'#666'}}>({new Date(s.createdAt).toLocaleString()})</span></div>
                <div>
                  <button onClick={()=>previewSnapshot(s.id, s.name)}>Preview</button>
                  <button style={{marginLeft:6}} onClick={()=>loadSnapshot(s.id)}>Load</button>
                  <button style={{marginLeft:6}} onClick={()=>restoreSnapshot(s.id)}>Restore</button>
                  <button style={{marginLeft:6}} onClick={()=>deleteSnapshot(s.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {ltData && ltData.blockIndex === selectedBlock && (
          <div style={{padding:8}}>
            <h4>Langzeittest - Ventils</h4>
            <ul>
              {ltData.ventils.map(v => <li key={v.index}>#{v.index} {v.name}: {formatValue(v.value)}</li>)}
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
                {measurements.block.ventils.map(v => <li key={v.index}>#{v.index} {v.name}: {formatValue(v.value)}</li>)}
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
                    {b.ventils.map(v => <li key={v.index}>#{v.index} {v.name}: {formatValue(v.value)}</li>)}
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
                        <td style={{fontSize:12,color:'#333'}}>Live: <code>{formatValue(p.value)}</code></td>
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

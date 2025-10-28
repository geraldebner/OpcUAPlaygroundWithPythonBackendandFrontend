import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(1);
  const [datasets, setDatasets] = useState([]);
  const [edits, setEdits] = useState({});
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'stored'
  const [activeTabExtra, setActiveTabExtra] = useState('live'); // compatibility variable
  const [einzelVentil, setEinzelVentil] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sending, setSending] = useState(false);
  const [measurements, setMeasurements] = useState({});
  const [ltData, setLtData] = useState(null);

  useEffect(() => { fetchAll(); fetchDatasets(); }, []);

  // auto refresh when on live tab
  useEffect(() => {
    if (!autoRefresh || activeTab !== 'live') return;
    const id = setInterval(() => fetchAll(), 3000);
    return () => clearInterval(id);
  }, [autoRefresh, activeTab]);

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

  // Ping server to check reachability
  async function pingServer() {
    try {
      await axios.get(`${API_BASE}/api/commands/ping`);
      return true;
    } catch (e) {
      console.warn('Ping failed', e);
      return false;
    }
  }

  // Centralized command sender with basic feedback
  async function sendCommand(params) {
    if (sending) return;
    setSending(true);
    try {
      const alive = await pingServer();
      if (!alive) {
        alert('Backend unreachable (ping failed).');
        return;
      }
      const res = await axios.post(`${API_BASE}/api/commands`, null, { params });
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

  async function fetchAll() {
    try {
      const res = await axios.get(`${API_BASE}/api/parameters`);
      const data = res.data || [];
      const norm = data.map(d => ({ index: d.index, groups: d.groups }));
      setBlocks(norm);
      // initialize per-parameter edit buffer
      const newEdits = {};
      for (const d of data) {
        const idx = d.index;
        // typed groups
        if (d.AllgemeineParameter && d.AllgemeineParameter.Items) {
          for (const [name, val] of Object.entries(d.AllgemeineParameter.Items)) {
            newEdits[`${idx}||AllgemeineParameterXX||${name}`] = val;
          }
        }
        if (d.Ventilkonfiguration && d.Ventilkonfiguration.Items) {
          for (const [name, val] of Object.entries(d.Ventilkonfiguration.Items)) {
            newEdits[`${idx}||Ventilkonfiguration||${name}`] = val;
          }
        }
        if (d.Konfiguration_Langzeittest && d.Konfiguration_Langzeittest.Items) {
          for (const [name, val] of Object.entries(d.Konfiguration_Langzeittest.Items)) {
            newEdits[`${idx}||Konfiguration_Langzeittest||${name}`] = val;
          }
        }
        if (d.Konfiguration_Detailtest && d.Konfiguration_Detailtest.Items) {
          for (const [name, val] of Object.entries(d.Konfiguration_Detailtest.Items)) {
            newEdits[`${idx}||Konfiguration_Detailtest||${name}`] = val;
          }
        }
        // generic groups
        if (d.groups) {
          for (const [g, list] of Object.entries(d.groups)) {
            for (const p of list) {
              newEdits[`${idx}||${g}||${p.name}`] = p.value;
            }
          }
        }
      }
      setEdits(newEdits);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchDatasets() {
    const res = await axios.get('/api/datasets');
    setDatasets(res.data || []);
  }

  function onParamChange(blockIndex, group, paramIndex, newValue) {
    setBlocks(prev => prev.map(b => {
      if (b.index !== blockIndex) return b;
      const g = { ...b.groups };
      const list = [...g[group]];
      list[paramIndex] = { ...list[paramIndex], value: newValue };
      g[group] = list;
      return { ...b, groups: g };
    }));
  }

  function getEditKey(blockIndex, group, name) {
    return `${blockIndex}||${group}||${name}`;
  }

  async function readParam(blockIndex, group, name) {
    try {
      const res = await axios.get(`${API_BASE}/api/parameters/${blockIndex}/value`, { params: { group, name } });
      const p = res.data;
      // update blocks state with new live value
      setBlocks(prev => prev.map(b => {
        if (b.index !== blockIndex) return b;
        const g = { ...(b.groups || {}) };
        if (!g[group]) g[group] = [];
        const list = g[group].map(item => item.name === p.name ? { ...item, value: p.value } : item);
        g[group] = list;
        return { ...b, groups: g };
      }));
      // update edit buffer
      setEdits(prev => ({ ...prev, [getEditKey(blockIndex, group, p.name)]: p.value }));
    } catch (e) {
      console.error('Read param failed', e);
      alert('Read failed. See console.');
    }
  }

  async function writeParam(blockIndex, group, name) {
    try {
      const key = getEditKey(blockIndex, group, name);
      const value = edits[key] ?? '';
      await axios.post(`${API_BASE}/api/parameters/${blockIndex}/value`, { value }, { params: { group, name } });
      // refresh live value
      await readParam(blockIndex, group, name);
    } catch (e) {
      console.error('Write param failed', e);
      alert('Write failed. See console.');
    }
  }

  async function saveDataset() {
    const b = blocks.find(x => x.index === selectedBlock);
    if (!b) return;
    const name = prompt('Name for dataset', `Snapshot_${selectedBlock}_${new Date().toISOString()}`) || '';
    const comment = prompt('Comment', '') || '';
    await axios.post(`${API_BASE}/api/datasets`, { name, comment, blockIndex: selectedBlock, block: b });
    fetchDatasets();
  }

  async function loadDataset(id) {
    const res = await axios.get(`${API_BASE}/api/datasets/${id}`);
    const b = res.data;
    setBlocks(prev => prev.map(pb => pb.index === b.index ? b : pb));
  }

  async function writeDatasetToOpc(id) {
    await axios.post(`${API_BASE}/api/datasets/${id}/write`);
    alert('Requested write to OPC UA server');
  }

  async function writeBlockToOpc() {
    const b = blocks.find(x => x.index === selectedBlock);
    if (!b) return;
    await axios.post(`${API_BASE}/api/parameters/${selectedBlock}`, b);
    alert('Write requested');
  }

  return (
    <div className="app-root">
      <header>
        <h2>VentilTester</h2>
      </header>
      <section className="controls">
        <div className="tabs">
          <button className={activeTab==='live'? 'active':''} onClick={() => setActiveTab('live')}>Live</button>
          <button className={activeTab==='stored'? 'active':''} onClick={() => setActiveTab('stored')}>Stored</button>
          <button className={activeTab==='commands'? 'active':''} onClick={() => setActiveTab('commands')} style={{marginLeft:8}}>Commands</button>
          <button className={activeTab==='measurements'? 'active':''} onClick={() => setActiveTab('measurements')} style={{marginLeft:8}}>Measurements</button>
        </div>

        <div>
          <label>Block: </label>
          <select value={selectedBlock} onChange={e => setSelectedBlock(Number(e.target.value))}>
            {blocks.map(b => <option key={b.index} value={b.index}>Block {b.index}</option>)}
          </select>
        </div>

        {activeTab === 'live' && (
          <div className="actions">
            <label style={{marginRight:8}}><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} /> Auto-refresh</label>
            <button onClick={fetchAll}>Refresh</button>
            <button onClick={saveDataset}>Save dataset</button>
            <button onClick={writeBlockToOpc}>Write block to OPC UA</button>
          </div>
        )}

        {activeTab === 'stored' && (
          <div className="actions">
            <button onClick={fetchDatasets}>Refresh list</button>
          </div>
        )}
        {activeTab === 'commands' && (
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
        )}
        {activeTab === 'measurements' && (
          <div className="actions">
            <div style={{display:'flex',gap:8,flexDirection:'column'}}>
              <div>
                <b>Langzeittest (block)</b>
                <button style={{marginLeft:8}} onClick={async ()=>{
                  const res = await axios.get(`${API_BASE}/api/langzeittest/${selectedBlock}`);
                  setLtData(res.data);
                }}>Refresh</button>
              </div>
              <div style={{marginTop:8}}>
                <b>Strommessung</b>
                <button style={{marginLeft:8}} onClick={async ()=>{
                  const res = await axios.get(`${API_BASE}/api/strommessung/status/${selectedBlock}`);
                  setMeasurements(prev=>({ ...prev, status: res.data }));
                }}>Block Status</button>
                <button style={{marginLeft:8}} onClick={async ()=>{
                  const res = await axios.get(`${API_BASE}/api/strommessung/status`);
                  setMeasurements(prev=>({ ...prev, allStatus: res.data }));
                }}>All Status</button>
                <button style={{marginLeft:8}} onClick={async ()=>{
                  const res = await axios.get(`${API_BASE}/api/strommessung/block/${selectedBlock}`);
                  setMeasurements(prev=>({ ...prev, block: res.data }));
                }}>Block Data</button>
                <button style={{marginLeft:8}} onClick={async ()=>{
                  const res = await axios.get(`${API_BASE}/api/strommessung/all`);
                  setMeasurements(prev=>({ ...prev, all: res.data }));
                }}>All Data</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <main className="main-grid">
        <div className="block-pane">
          {blocks.filter(b => b.index === selectedBlock).map(b => (
            <div key={b.index} className="block-card">
              <h3>Block {b.index}</h3>

              {activeTab === 'measurements' && ltData && ltData.blockIndex === b.index && (
                <div style={{padding:8}}>
                  <h4>Langzeittest - Ventils</h4>
                  <ul>
                    {ltData.ventils.map(v => <li key={v.index}>#{v.index} {v.name}: {v.value}</li>)}
                  </ul>
                </div>
              )}

              

              {/* fallback: render generic groups if present */}
              {b.groups && Object.keys(b.groups).length > 0 && Object.keys(b.groups).map(g => (
                <div key={g} className="group-card">
                  <h4>{g}</h4>
                  <table className="param-table">
                    <tbody>
                      {b.groups[g].map((p, i) => {
                        const key = getEditKey(b.index, g, p.name);
                        const live = p.value;
                        return (
                        <tr key={p.name}>
                          <td className="param-name">{p.name}</td>
                          <td style={{fontSize:12,color:'#333'}}>Live: <code>{live}</code></td>
                          <td>
                            <input value={edits[key] ?? live} onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))} />
                          </td>
                          <td style={{display:'flex',gap:6}}>
                            <button onClick={() => readParam(b.index, g, p.name)}>Read</button>
                            <button onClick={() => writeParam(b.index, g, p.name)}>Write</button>
                          </td>
                        </tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

            </div>
          ))}
        </div>

        <aside className="datasets-pane">
          {activeTab === 'stored' ? (
            <>
              <h3>Stored Datasets</h3>
              <ul className="dataset-list">
                {datasets.map(ds => (
                  <li key={ds.id} className="dataset-item">
                    <div className="dataset-meta">
                      <b>{ds.name}</b>
                      <small>{new Date(ds.createdAt).toLocaleString()}</small>
                    </div>
                    <div className="dataset-actions">
                      <button onClick={() => loadDataset(ds.id)}>Load into UI</button>
                      <button onClick={() => writeDatasetToOpc(ds.id)}>Write to OPC</button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h3>Live / Saved</h3>
              <div style={{padding:8}}>
                <button onClick={fetchAll}>Refresh Live</button>
                <button onClick={saveDataset} style={{marginLeft:8}}>Save current as dataset</button>
              </div>
            </>
          )}

          {activeTab === 'measurements' && (
            <div style={{padding:8}}>
              <h3>Measurements</h3>
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
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;

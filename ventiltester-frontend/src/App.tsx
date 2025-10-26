import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

// API base URL: you can set `window.__API_BASE = 'https://...'` in the browser for overrides.
const API_BASE = (window as any)?.__API_BASE || 'http://localhost:5000';

type Parameter = { name: string; value: string };
type Block = { index: number; groups: Record<string, Parameter[]> };

function App() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<number>(1);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [opcConnected, setOpcConnected] = useState<boolean | null>(null);

  useEffect(() => { fetchDatasets(); fetchBlock(selectedBlock); }, []);

  // auto-refresh the currently selected block every 3s
  useEffect(() => {
    const id = setInterval(() => fetchBlock(selectedBlock), 3000);
    return () => clearInterval(id);
  }, [selectedBlock]);

  // status poller (every 5s) so the header status updates independently
  useEffect(() => {
    fetchStatus();
    const sid = setInterval(() => fetchStatus(), 5000);
    return () => clearInterval(sid);
  }, []);

  async function fetchBlock(index: number) {
    try {
      const res = await axios.get(`${API_BASE}/api/parameters/${index}`);
      const data = res.data as any;
      const norm = { index: data.index, groups: data.groups };
      setBlocks([norm]);
      setErrorMessage(null);
      setLastUpdated(new Date().toLocaleTimeString());
      // update OPC UA connection status if available
      try {
        const s = await axios.get(`${API_BASE}/api/status`);
        setOpcConnected(!!s.data?.opcua);
      } catch { setOpcConnected(null); }
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to fetch live data for block ' + index + '. Check backend and simulation server.');
    }
  }

  async function fetchStatus() {
    try {
      const s = await axios.get(`${API_BASE}/api/status`);
      setOpcConnected(!!s.data?.opcua);
    } catch (e) {
      console.error('Status fetch failed', e);
      setOpcConnected(false);
    }
  }

  async function fetchDatasets() {
    const res = await axios.get(`${API_BASE}/api/datasets`);
    setDatasets(res.data);
  }

  function onParamChange(blockIndex: number, group: string, paramIndex: number, newValue: string) {
    setBlocks(prev => prev.map(b => {
      if (b.index !== blockIndex) return b;
      const g = { ...b.groups } as Record<string, any>;
      const list = [...g[group]];
      list[paramIndex] = { ...list[paramIndex], value: newValue };
      g[group] = list;
      return { ...b, groups: g };
    }));
  }

  async function saveDataset() {
    const b = blocks.find(x => x.index === selectedBlock);
    if (!b) return;
    const name = prompt('Name for dataset', `Snapshot_${selectedBlock}_${new Date().toISOString()}`) || '';
    const comment = prompt('Comment', '') || '';
    await axios.post(`${API_BASE}/api/datasets`, { name, comment, blockIndex: selectedBlock, block: b });
    fetchDatasets();
  }

  async function loadDataset(id: number) {
    const res = await axios.get(`${API_BASE}/api/datasets/${id}`);
    const b = res.data as Block;
    setBlocks(prev => prev.map(pb => pb.index === b.index ? b : pb));
  }

  async function writeDatasetToOpc(id: number) {
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
      {/* Error / status banner */}
      {errorMessage ? (
        <div style={{backgroundColor:'#f8d7da',color:'#842029',padding:8,borderRadius:4,margin:8}}>
          <strong>Live data error:</strong> {errorMessage}
        </div>
      ) : (blocks.length === 0 ? (
        <div style={{backgroundColor:'#fff3cd',color:'#664d03',padding:8,borderRadius:4,margin:8}}>
          <strong>No live data:</strong> No blocks received from backend yet. Is the simulation server running?
        </div>
      ) : (
        lastUpdated && <div style={{backgroundColor:'#e6ffed',color:'#0b6623',padding:6,borderRadius:4,margin:8}}>Live: last updated {lastUpdated}</div>
      ))}
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px'}}>
        <h2 style={{margin:0}}>VentilTester</h2>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {/* OPC UA status */}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:12,height:12,borderRadius:12,backgroundColor: opcConnected === null ? '#aaa' : (opcConnected ? '#0b6623' : '#c92a2a'),boxShadow:'0 0 4px rgba(0,0,0,0.15)'}} />
            <div style={{fontSize:12,color:'#333'}}>{opcConnected === null ? 'OPC UA: unknown' : (opcConnected ? 'OPC UA: connected' : 'OPC UA: disconnected')}</div>
          </div>
          <div style={{fontSize:12,color:'#666'}}>{lastUpdated ? `Last: ${lastUpdated}` : ''}</div>
        </div>
      </header>

      {/* Debug panel: show raw blocks JSON to help diagnose empty dropdown */}
      <div style={{margin:8,padding:8,border:'1px solid #ddd',borderRadius:4,background:'#fafafa'}}>
        <strong>Debug — blocks state</strong>
        <div style={{marginTop:6,fontSize:12,color:'#333'}}>
          <div>errorMessage: {errorMessage ? errorMessage : 'none'}</div>
          <div>opcConnected: {String(opcConnected)}</div>
          <div>lastUpdated: {lastUpdated}</div>
        </div>
        <pre style={{marginTop:8,maxHeight:200,overflow:'auto',background:'#fff',padding:8,border:'1px solid #eee'}}>{JSON.stringify(blocks,null,2)}</pre>
      </div>
      <section className="controls">
        <div>
          <label>Block: </label>
          <select value={selectedBlock} onChange={e => { const v = Number(e.target.value); setSelectedBlock(v); fetchBlock(v); }}>
            {blocks.map(b => <option key={b.index} value={b.index}>Block {b.index}</option>)}
          </select>
        </div>
        <div className="actions">
          <button onClick={saveDataset}>Save dataset</button>
          <button onClick={writeBlockToOpc}>Write block to OPC UA</button>
        </div>
      </section>

      <main className="main-grid">
        <div className="block-pane">
          {blocks.filter(b => b.index === selectedBlock).map(b => (
            <div key={b.index} className="block-card">
              <h3>Block {b.index}</h3>
              {Object.keys(b.groups).map(g => (
                <div key={g} className="group-card">
                  <h4>{g}</h4>
                  <table className="param-table">
                    <tbody>
                      {b.groups[g].map((p, i) => (
                        <tr key={p.name}>
                          <td className="param-name">{p.name}</td>
                          <td>
                            <input value={p.value} onChange={e => onParamChange(b.index, g, i, e.target.value)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>

        <aside className="datasets-pane">
          <h3>Datasets</h3>
          <ul className="dataset-list">
            {datasets.map(ds => (
              <li key={ds.id} className="dataset-item">
                <div className="dataset-meta">
                  <b>{ds.name}</b>
                  <small>{new Date(ds.createdAt).toLocaleString()}</small>
                </div>
                <div className="dataset-actions">
                  <button onClick={() => loadDataset(ds.id)}>Load</button>
                  <button onClick={() => writeDatasetToOpc(ds.id)}>Write</button>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}

export default App;

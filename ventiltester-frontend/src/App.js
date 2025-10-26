import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(1);
  const [datasets, setDatasets] = useState([]);
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'stored'
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => { fetchAll(); fetchDatasets(); }, []);

  // auto refresh when on live tab
  useEffect(() => {
    if (!autoRefresh || activeTab !== 'live') return;
    const id = setInterval(() => fetchAll(), 3000);
    return () => clearInterval(id);
  }, [autoRefresh, activeTab]);

  async function fetchAll() {
    try {
      const res = await axios.get('/api/parameters');
      const data = res.data || [];
      const norm = data.map(d => ({ index: d.index, groups: d.groups }));
      setBlocks(norm);
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

  async function saveDataset() {
    const b = blocks.find(x => x.index === selectedBlock);
    if (!b) return;
    const name = prompt('Name for dataset', `Snapshot_${selectedBlock}_${new Date().toISOString()}`) || '';
    const comment = prompt('Comment', '') || '';
    await axios.post('/api/datasets', { name, comment, blockIndex: selectedBlock, block: b });
    fetchDatasets();
  }

  async function loadDataset(id) {
    const res = await axios.get(`/api/datasets/${id}`);
    const b = res.data;
    setBlocks(prev => prev.map(pb => pb.index === b.index ? b : pb));
  }

  async function writeDatasetToOpc(id) {
    await axios.post(`/api/datasets/${id}/write`);
    alert('Requested write to OPC UA server');
  }

  async function writeBlockToOpc() {
    const b = blocks.find(x => x.index === selectedBlock);
    if (!b) return;
    await axios.post(`/api/parameters/${selectedBlock}`, b);
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
      </section>

      <main className="main-grid">
        <div className="block-pane">
          {blocks.filter(b => b.index === selectedBlock).map(b => (
            <div key={b.index} className="block-card">
              <h3>Block {b.index}</h3>

              {/* Typed groups first */}
              <div className="group-card">
                <h4>AllgemeineParameter</h4>
                <table className="param-table">
                  <tbody>
                    {b.AllgemeineParameter && Object.entries(b.AllgemeineParameter.Items || {}).map(([name, val], i) => (
                      <tr key={name}>
                        <td className="param-name">{name}</td>
                        <td>
                          <input value={val} onChange={e => {
                            // update typed dict locally
                            const newBlocks = blocks.map(bb => {
                              if (bb.index !== b.index) return bb;
                              const copy = { ...bb };
                              copy.AllgemeineParameter = copy.AllgemeineParameter || { Items: {} };
                              copy.AllgemeineParameter.Items = { ...copy.AllgemeineParameter.Items, [name]: e.target.value };
                              return copy;
                            });
                            setBlocks(newBlocks);
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="group-card">
                <h4>Ventilkonfiguration</h4>
                <table className="param-table">
                  <tbody>
                    {b.Ventilkonfiguration && Object.entries(b.Ventilkonfiguration.Items || {}).map(([name, val], i) => (
                      <tr key={name}>
                        <td className="param-name">{name}</td>
                        <td>
                          <input value={val} onChange={e => {
                            const newBlocks = blocks.map(bb => {
                              if (bb.index !== b.index) return bb;
                              const copy = { ...bb };
                              copy.Ventilkonfiguration = copy.Ventilkonfiguration || { Items: {} };
                              copy.Ventilkonfiguration.Items = { ...copy.Ventilkonfiguration.Items, [name]: e.target.value };
                              return copy;
                            });
                            setBlocks(newBlocks);
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="group-card">
                <h4>Konfiguration_Langzeittest</h4>
                <table className="param-table">
                  <tbody>
                    {b.Konfiguration_Langzeittest && Object.entries(b.Konfiguration_Langzeittest.Items || {}).map(([name, val], i) => (
                      <tr key={name}>
                        <td className="param-name">{name}</td>
                        <td>
                          <input value={val} onChange={e => {
                            const newBlocks = blocks.map(bb => {
                              if (bb.index !== b.index) return bb;
                              const copy = { ...bb };
                              copy.Konfiguration_Langzeittest = copy.Konfiguration_Langzeittest || { Items: {} };
                              copy.Konfiguration_Langzeittest.Items = { ...copy.Konfiguration_Langzeittest.Items, [name]: e.target.value };
                              return copy;
                            });
                            setBlocks(newBlocks);
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="group-card">
                <h4>Konfiguration_Detailtest</h4>
                <table className="param-table">
                  <tbody>
                    {b.Konfiguration_Detailtest && Object.entries(b.Konfiguration_Detailtest.Items || {}).map(([name, val], i) => (
                      <tr key={name}>
                        <td className="param-name">{name}</td>
                        <td>
                          <input value={val} onChange={e => {
                            const newBlocks = blocks.map(bb => {
                              if (bb.index !== b.index) return bb;
                              const copy = { ...bb };
                              copy.Konfiguration_Detailtest = copy.Konfiguration_Detailtest || { Items: {} };
                              copy.Konfiguration_Detailtest.Items = { ...copy.Konfiguration_Detailtest.Items, [name]: e.target.value };
                              return copy;
                            });
                            setBlocks(newBlocks);
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* fallback: render generic groups if present */}
              {b.groups && Object.keys(b.groups).length > 0 && Object.keys(b.groups).map(g => (
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
        </aside>
      </main>
    </div>
  );
}

export default App;

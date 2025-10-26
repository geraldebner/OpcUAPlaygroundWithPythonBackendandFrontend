import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

type Parameter = { name: string; value: string };
type Block = { index: number; groups: Record<string, Parameter[]> };

function App() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<number>(1);
  const [datasets, setDatasets] = useState<any[]>([]);

  useEffect(() => { fetchAll(); fetchDatasets(); }, []);

  async function fetchAll() {
    try {
      const res = await axios.get('/api/parameters');
      const data = res.data as any[];
      // normalize shape to {index, groups}
      const norm = data.map(d => ({ index: d.index, groups: d.groups }));
      setBlocks(norm);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchDatasets() {
    const res = await axios.get('/api/datasets');
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
    await axios.post('/api/datasets', { name, comment, blockIndex: selectedBlock, block: b });
    fetchDatasets();
  }

  async function loadDataset(id: number) {
    const res = await axios.get(`/api/datasets/${id}`);
    const b = res.data as Block;
    setBlocks(prev => prev.map(pb => pb.index === b.index ? b : pb));
  }

  async function writeDatasetToOpc(id: number) {
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
        <div>
          <label>Block: </label>
          <select value={selectedBlock} onChange={e => setSelectedBlock(Number(e.target.value))}>
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

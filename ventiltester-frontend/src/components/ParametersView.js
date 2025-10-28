import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ParametersView({ apiBase, selectedBlock }) {
  const [blocks, setBlocks] = useState([]);
  const [edits, setEdits] = useState({});
  const [paramInnerTab, setParamInnerTab] = useState('live');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [datasets, setDatasets] = useState([]);

  useEffect(() => { fetchAll(); fetchDatasets(); }, []);

  useEffect(() => {
    if (!autoRefresh || paramInnerTab !== 'live') return;
    const id = setInterval(() => fetchAll(), 3000);
    return () => clearInterval(id);
  }, [autoRefresh, paramInnerTab]);

  async function fetchAll() {
    try {
      const res = await axios.get(`${apiBase}/api/parameters`);
      const data = res.data || [];
      setBlocks(data.map(d => ({ index: d.index, groups: d.groups })));
      const newEdits = {};
      for (const d of data) {
        const idx = d.index;
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
      console.error('ParametersView.fetchAll', e);
    }
  }

  async function fetchDatasets() {
    try {
      const res = await axios.get('/api/datasets');
      setDatasets(res.data || []);
    } catch (e) {
      console.error('fetchDatasets', e);
    }
  }

  function getEditKey(blockIndex, group, name) {
    return `${blockIndex}||${group}||${name}`;
  }

  async function readParam(blockIndex, group, name) {
    try {
      const res = await axios.get(`${apiBase}/api/parameters/${blockIndex}/value`, { params: { group, name } });
      const p = res.data;
      await fetchAll();
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
      await axios.post(`${apiBase}/api/parameters/${blockIndex}/value`, { value }, { params: { group, name } });
      await readParam(blockIndex, group, name);
    } catch (e) {
      console.error('Write param failed', e);
      alert('Write failed. See console.');
    }
  }

  async function saveDataset(selectedBlock) {
    const b = blocks.find(x => x.index === selectedBlock);
    if (!b) return;
    const name = prompt('Name for dataset', `Snapshot_${selectedBlock}_${new Date().toISOString()}`) || '';
    const comment = prompt('Comment', '') || '';
    await axios.post(`${apiBase}/api/datasets`, { name, comment, blockIndex: selectedBlock, block: b });
    fetchDatasets();
  }

  async function writeBlockToOpc(selectedBlock) {
    const b = blocks.find(x => x.index === selectedBlock);
    if (!b) return;
    await axios.post(`${apiBase}/api/parameters/${selectedBlock}`, b);
    alert('Write requested');
  }

  return (
    <div>
      <div className="actions">
        <div className="tabs">
          <button className={paramInnerTab==='live'? 'active':''} onClick={() => setParamInnerTab('live')}>Live</button>
          <button className={paramInnerTab==='stored'? 'active':''} onClick={() => setParamInnerTab('stored')} style={{marginLeft:8}}>Stored</button>
        </div>
      </div>

      {paramInnerTab === 'live' && (
        <div className="actions">
          <label style={{marginRight:8}}><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)} /> Auto-refresh</label>
          <button onClick={fetchAll}>Refresh</button>
          <button onClick={() => saveDataset(selectedBlock)}>Save dataset</button>
          <button onClick={() => writeBlockToOpc(selectedBlock)}>Write block to OPC UA</button>
        </div>
      )}

      <div style={{paddingTop:12}}>
        {blocks.filter(b => b.index === selectedBlock).map(b => (
          <div key={b.index} className="block-card">
            <h3>Block {b.index} — Parameters</h3>
            {b.groups && Object.keys(b.groups).length > 0 && Object.keys(b.groups).filter(g => {
              const n = (g||'').toLowerCase();
              return !(n.includes('daten') || n.includes('strom') || n.includes('kommand'));
            }).map(g => (
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
                          <td style={{fontSize:12,color:'#333'}}>Live: <code>{String(live)}</code></td>
                          <td>
                            <input value={edits[key] ?? live} onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))} />
                          </td>
                          <td style={{display:'flex',gap:6}}>
                            <button onClick={() => readParam(b.index, g, p.name)}>Read</button>
                            <button onClick={() => writeParam(b.index, g, p.name)}>Write</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>

      {paramInnerTab === 'stored' && (
        <div style={{paddingTop:12}}>
          <h3>Stored Datasets</h3>
          <ul className="dataset-list">
            {datasets.map(ds => (
              <li key={ds.id} className="dataset-item">
                <div className="dataset-meta">
                  <b>{ds.name}</b>
                  <small>{new Date(ds.createdAt).toLocaleString()}</small>
                </div>
                <div className="dataset-actions">
                  <button onClick={() => {/* load handled by parent if needed */}}>Load into UI</button>
                  <button onClick={() => {/* write handled by parent if needed */}}>Write to OPC</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

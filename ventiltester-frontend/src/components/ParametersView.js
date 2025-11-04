import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ParametersView({ apiBase, selectedBlock }) {
  function formatValue(v) {
    if (v === null || v === undefined) return '';
    // if it's already an array
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'string') {
      // try parse JSON arrays
      try {
        const p = JSON.parse(v);
        if (Array.isArray(p)) return p.join(', ');
        if (typeof p === 'object') return JSON.stringify(p);
      } catch { }
      return v;
    }
    return String(v);
  }
  const [blocks, setBlocks] = useState([]);
  const [edits, setEdits] = useState({});
  const [paramInnerTab, setParamInnerTab] = useState('live');
  // start with auto-refresh disabled to avoid background polling by default
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [datasets, setDatasets] = useState([]);

  useEffect(() => { fetchDatasets(); }, []);

  // when selectedBlock changes, ensure we have a placeholder entry so UI can show parameters even if live data is not loaded
  useEffect(() => {
    // if blocks already contains the selected block, nothing to do
    if (blocks.find(b => b.index === selectedBlock)) return;
    // otherwise try to fetch mapping for the block to populate parameter names with empty values
    let mounted = true;
    const fetchMapping = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/mapping/${selectedBlock}`);
        const groups = res.data?.groups || {};
        // normalize groups into same shape as /api/parameters
        const outGroups = {};
        for (const [g, list] of Object.entries(groups)) {
          outGroups[g] = (list || []).map(p => ({ name: p.name, value: '' }));
        }
        // also try fetch typed AllgemeineParameter and merge into groups
        try {
          // use generic group endpoint which returns an array of { name, value }
          const ares = await axios.get(`${apiBase}/api/parameters/${selectedBlock}/group/AllgemeineParameter`);
          const ap = ares.data;
          if (Array.isArray(ap)) {
            outGroups['AllgemeineParameter'] = (ap || []).map(p => ({ name: p.name, value: p.value }));
          }
        } catch { /* ignore fetch errors */ }
        if (mounted) setBlocks(prev => {
          const others = prev.filter(x => x.index !== selectedBlock);
          return [...others, { index: selectedBlock, groups: outGroups }];
        });
      } catch (e) {
        // ignore mapping fetch errors; UI will remain empty
        // console.debug('mapping fetch failed', e);
      }
    };
    fetchMapping();
    return () => { mounted = false; };
  }, [selectedBlock]);

  useEffect(() => {
    if (!autoRefresh) return;
    if (paramInnerTab !== 'live') return;
    const id = setInterval(() => refreshBlock(selectedBlock), 3000);
    return () => clearInterval(id);
  }, [autoRefresh, paramInnerTab, selectedBlock]);

  // Refresh data for the given block: fetch mapping and typed groups and existing group values
  async function refreshBlock(blockIndex) {
    if (!blockIndex) return;
    try {
      const res = await axios.get(`${apiBase}/api/mapping/${blockIndex}`);
      const groups = res.data?.groups || {};
      const outGroups = {};
      for (const [g, list] of Object.entries(groups)) {
        outGroups[g] = (list || []).map(p => ({ name: p.name, value: '' }));
      }

      // fetch typed-ish groups via the generic group endpoint (returns array of {name, value})
      const typedNames = ['AllgemeineParameter', 'Ventilkonfiguration', 'Konfiguration_Langzeittest', 'Konfiguration_Detailtest'];
      for (const tn of typedNames) {
        try {
          const tret = await axios.get(`${apiBase}/api/parameters/${blockIndex}/group/${encodeURIComponent(tn)}`);
          const tdata = tret.data;
          if (Array.isArray(tdata)) {
            outGroups[tn] = (tdata || []).map(p => ({ name: p.name, value: p.value }));
          }
        } catch { }
      }

      // for each non-typed group, try to fetch group values (best-effort)
      for (const g of Object.keys(outGroups)) {
        if (typedNames.includes(g)) continue;
        try {
          const gre = await axios.get(`${apiBase}/api/parameters/${blockIndex}/group/${encodeURIComponent(g)}`);
          outGroups[g] = (gre.data || []).map(p => ({ name: p.name, value: p.value }));
        } catch { /* ignore per-group fetch errors */ }
      }

      setBlocks(prev => {
        const others = prev.filter(x => x.index !== blockIndex);
        return [...others, { index: blockIndex, groups: outGroups }];
      });

      // update edits for this block
      setEdits(prev => {
        const next = { ...prev };
        for (const [g, list] of Object.entries(outGroups)) {
          for (const p of list) {
            const key = `${blockIndex}||${g}||${p.name}`;
            if (!(key in next)) next[key] = p.value ?? '';
          }
        }
        return next;
      });
    } catch (e) {
      console.error('refreshBlock', e);
    }
  }

  async function fetchDatasets() {
    try {
      const res = await axios.get(`${apiBase}/api/datasets`);
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
      setEdits(prev => ({ ...prev, [getEditKey(blockIndex, group, p.name)]: p.value }));
      // refresh the block to update related live values
      try { await refreshBlock(blockIndex); } catch { /* ignore refresh errors */ }
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
    // send as legacy dataset shape to /api/datasets (supports { block: ... } for backwards compatibility)
    await axios.post(`${apiBase}/api/datasets`, { name, comment, blockIndex: selectedBlock, block: b });
    fetchDatasets();
  }

  async function loadDataset(id) {
    try {
      const res = await axios.get(`${apiBase}/api/datasets/${id}`);
      const payload = res.data?.payload;
      if (!payload) { alert('Dataset has no payload'); return; }
      let obj = null;
      try { obj = JSON.parse(payload); } catch { obj = payload; }
      // set loaded block into UI for selectedBlock
      // update blocks and edits for the selected block
      setBlocks(prev => {
        const others = prev.filter(x => x.index !== selectedBlock);
        return [...others, { index: selectedBlock, groups: obj.groups || obj }];
      });
      // populate edits from loaded block
      const newEdits = { ...edits };
      const groups = obj.groups || obj;
      if (groups) {
        for (const [g, list] of Object.entries(groups)) {
          for (const p of list) {
            newEdits[`${selectedBlock}||${g}||${p.name}`] = p.value;
          }
        }
      }
      setEdits(newEdits);
      alert('Dataset loaded into UI (preview)');
    } catch (e) {
      console.error('loadDataset', e);
      alert('Load dataset failed');
    }
  }

  async function writeDatasetToOpc(id) {
    if (!confirm('Write this parameter set to the OPC UA device?')) return;
    try {
      const res = await axios.post(`${apiBase}/api/datasets/${id}/write`);
      if (res.status >= 200 && res.status < 300) {
        alert('Dataset written to OPC UA');
      } else {
        alert('Write failed: ' + res.status);
      }
    } catch (e) {
      console.error('writeDatasetToOpc', e);
      alert('Write dataset failed');
    }
  }

  async function deleteDataset(id) {
    if (!confirm('Delete dataset?')) return;
    try {
      await axios.delete(`${apiBase}/api/datasets/${id}`);
      fetchDatasets();
    } catch (e) {
      console.error('deleteDataset', e);
      alert('Delete failed');
    }
  }

  async function writeBlockToOpc(selectedBlock) {
    const b = blocks.find(x => x.index === selectedBlock);
    if (!b) return;
    await axios.post(`${apiBase}/api/parameters/${selectedBlock}`, b);
    alert('Write requested');
  }

  

  // read a single group for the block and merge into state
  async function readGroup(blockIndex, groupName) {
    try {
      const gre = await axios.get(`${apiBase}/api/parameters/${blockIndex}/group/${encodeURIComponent(groupName)}`);
      const list = (gre.data || []).map(p => ({ name: p.name, value: p.value }));
      setBlocks(prev => {
        const others = prev.filter(x => x.index !== blockIndex);
        return [...others, { index: blockIndex, groups: { ...(prev.find(x => x.index === blockIndex)?.groups || {}), [groupName]: list } }];
      });
      // update edits for this group's entries
      setEdits(prev => {
        const next = { ...prev };
        for (const p of list) {
          const key = getEditKey(blockIndex, groupName, p.name);
          if (!(key in next)) next[key] = p.value ?? '';
        }
        return next;
      });
    } catch (e) {
      console.error('readGroup failed', e);
      alert(`Read group ${groupName} failed`);
    }
  }

  // write the whole group (uses generic POST /group/{name})
  async function writeGroup(blockIndex, groupName) {
    if (!confirm(`Write ${groupName} for this block to the OPC UA device?`)) return;
    const b = blocks.find(x => x.index === blockIndex);
    if (!b || !b.groups || !b.groups[groupName]) {
      alert(`No ${groupName} data available for this block`);
      return;
    }
    const parameters = [];
    for (const p of b.groups[groupName]) {
      const key = getEditKey(blockIndex, groupName, p.name);
      const val = edits[key] ?? p.value ?? '';
      parameters.push({ name: p.name, value: val });
    }
    try {
      await axios.post(`${apiBase}/api/parameters/${blockIndex}/group/${encodeURIComponent(groupName)}`, parameters);
      alert(`${groupName} write requested`);
      try { await readGroup(blockIndex, groupName); } catch { /* ignore */ }
    } catch (e) {
      console.error('writeGroup failed', e);
      alert('Write failed');
    }
  }

  return (
    <div>
      <div className="actions">
        <div className="tabs">
          <button className={paramInnerTab === 'live' ? 'active' : ''} onClick={() => setParamInnerTab('live')}>Live</button>
          <button className={paramInnerTab === 'stored' ? 'active' : ''} onClick={() => setParamInnerTab('stored')} style={{ marginLeft: 8 }}>Stored</button>
        </div>
      </div>

      {paramInnerTab === 'live' && (
        <div className="actions">
          <label style={{ marginRight: 8 }}><input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto-refresh</label>
          <button onClick={() => refreshBlock(selectedBlock)}>Refresh</button>
          <button onClick={() => saveDataset(selectedBlock)}>Save dataset</button>
          <button onClick={() => writeBlockToOpc(selectedBlock)}>Write block to OPC UA</button>
        </div>
      )}

      <div style={{ paddingTop: 12 }}>
        {blocks.filter(b => b.index === selectedBlock).map(b => (
          <div key={b.index} className="block-card">
            <h3>Block {b.index} — Parameters</h3>
            {b.groups && Object.keys(b.groups).length > 0 &&
              // present typed/important groups first, then the rest
              Object.keys(b.groups)
                .filter(g => {
                  const n = (g || '').toLowerCase();
                  return !(n.includes('daten') || n.includes('strom') || n.includes('kommand'));
                })
                .sort((a, bname) => {
                  const order = ['AllgemeineParameter', 'Ventilkonfiguration', 'Konfiguration_Langzeittest', 'Konfiguration_Detailtest'];
                  const ai = order.indexOf(a);
                  const bi = order.indexOf(bname);
                  if (ai === -1 && bi === -1) return a.localeCompare(bname);
                  if (ai === -1) return 1;
                  if (bi === -1) return -1;
                  return ai - bi;
                })
                .map(g => (
                  <div key={g} className="group-card">
                    <h4>{g}</h4>
                    <div style={{ marginBottom: 8 }}>
                      <button onClick={() => readGroup(b.index, g)}>Read</button>
                      <button onClick={() => writeGroup(b.index, g)} style={{ marginLeft: 8 }}>Write</button>
                    </div>
                    <table className="param-table">
                      <tbody>
                        {b.groups[g].map((p, i) => {
                          const key = getEditKey(b.index, g, p.name);
                          const live = p.value;
                          return (
                            <tr key={p.name}>
                              <td className="param-name">{p.name}</td>
                              <td style={{ fontSize: 12, color: '#333' }}>Live: <code>{formatValue(live)}</code></td>
                              <td>
                                <input value={edits[key] ?? live} onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))} />
                              </td>
                              <td style={{ display: 'flex', gap: 6 }}>
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
        <div style={{ paddingTop: 12 }}>
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
                  <button style={{ marginLeft: 8 }} onClick={() => deleteDataset(ds.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

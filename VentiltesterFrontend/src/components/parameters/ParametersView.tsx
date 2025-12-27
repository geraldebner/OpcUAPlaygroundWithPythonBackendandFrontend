import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ParameterLiveDataPanel from './ParameterLiveDataPanel';
import ParameterDataSetPanel from './ParameterDataSetPanel';
import {
  Block,
  Dataset,
  Edits,
  BusyGroups,
  ParametersViewProps,
  TabType
} from '../../types';

// Enum for parameter set types
enum ParameterSetType {
  All = 'All',
  VentilAnsteuerparameter = 'VentilAnsteuerparameter',
  Langzeittestparameter = 'Langzeittestparameter',
  Detailtestparameter = 'Detailtestparameter',
  Einzeltestparameter = 'Einzeltestparameter',
  Komponenten = 'Komponenten'
}

// Type options with descriptions
const TYPE_OPTIONS = [
  { value: ParameterSetType.All, label: 'All (alle Parameter)', group: null },
  { value: ParameterSetType.VentilAnsteuerparameter, label: 'VentilAnsteuerparameter', group: 'Ventilkonfiguration/Ansteuerparameter' },
  { value: ParameterSetType.Langzeittestparameter, label: 'Langzeittestparameter', group: 'Ventilkonfiguration/Langzeittest' },
  { value: ParameterSetType.Detailtestparameter, label: 'Detailtestparameter', group: 'Ventilkonfiguration/Detailtest' },
  { value: ParameterSetType.Einzeltestparameter, label: 'Einzeltestparameter', group: 'Ventilkonfiguration/Einzeltest' },
  { value: ParameterSetType.Komponenten, label: 'Komponenten (Sensor-Regler)', group: 'Ventilkonfiguration/Sensor-Regler' }
];

export default function ParametersView({ apiBase, selectedBlock }: ParametersViewProps) {
  function formatValue(v: any): string {
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

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [edits, setEdits] = useState<Edits>({});
  const [paramInnerTab, setParamInnerTab] = useState<TabType>('live');
  // start with auto-refresh disabled to avoid background polling by default
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [parameterDatasets, setParameterDatasets] = useState<Dataset[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [busyGroups, setBusyGroups] = useState<BusyGroups>({});
  const [datasetsLoading, setDatasetsLoading] = useState<boolean>(false);
  
  // State for dataset save modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalData, setSaveModalData] = useState({ name: '', comment: '', type: ParameterSetType.All, blockIndex: 0 });

  useEffect(() => { fetchParameterDatasets(); }, []); // wird nur einmal ausgeführt

  // when selectedBlock changes, ensure we have a placeholder entry so UI can show parameters even if live data is not loaded
  useEffect(() => {
    // if blocks already contains the selected block, nothing to do
    if (blocks.find(b => b.index === selectedBlock))
      return;
    // otherwise try to fetch mapping for the block to populate parameter names with empty values
    let mounted = true;

    const fetchMapping = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/mapping/${selectedBlock}`);
        const groups = res.data?.groups || {};
        // normalize groups into same shape as /api/parameters
        const outGroups: { [key: string]: any[] } = {};
        for (const [g, list] of Object.entries(groups)) {
          // keep mapping nodeId when provided by the mapping endpoint
          const listArray = Array.isArray(list) ? list : [];
          outGroups[g] = listArray.map((p: any) => ({ name: p.name, value: '', nodeId: p.nodeId }));
        }
        // also try fetch typed AllgemeineParameter and merge into groups
        try {
          // use generic group endpoint which returns an array of { name, value }
          const ares = await axios.get(`${apiBase}/api/parameters/${selectedBlock}/group/AllgemeineParameter`);
          const ap = ares.data;
          if (Array.isArray(ap)) {
            outGroups['AllgemeineParameter'] = (ap || []).map((p: any) => ({ name: p.name, value: p.value }));
          }
        } catch { /* ignore fetch errors */ }
        
        // also try to load Ventilkonfiguration Sensor-Regler group if it exists
        try {
          const sensorRes = await axios.get(`${apiBase}/api/parameters/${selectedBlock}/group/${encodeURIComponent('Ventilkonfiguration/Sensor-Regler')}`);
          const sp = sensorRes.data;
          if (Array.isArray(sp)) {
            outGroups['Ventilkonfiguration/Sensor-Regler'] = (sp || []).map((p: any) => ({ name: p.name, value: p.value }));
          }
        } catch { /* ignore fetch errors if group doesn't exist */ }
        if (mounted && selectedBlock !== null) setBlocks(prev => {
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
  }, [selectedBlock, apiBase]);

  useEffect(() => {
    if (!autoRefresh)
      return;
    if (paramInnerTab !== 'live')
      return;
    const id = setInterval(() => refreshBlock(selectedBlock!), 3000);
    return () => clearInterval(id);
  }, [autoRefresh, paramInnerTab, selectedBlock]);

  // Refresh data for the given block: fetch mapping and typed groups and existing group values
  async function refreshBlock(blockIndex: number): Promise<void> {
    if (!blockIndex) return;
    setIsRefreshing(true);
    try {
      const res = await axios.get(`${apiBase}/api/mapping/${blockIndex}`);
      const groups = res.data?.groups || {};
      const outGroups: { [key: string]: any[] } = {};
      for (const [g, list] of Object.entries(groups)) {
        const listArray = Array.isArray(list) ? list : [];
        outGroups[g] = listArray.map((p: any) => ({ name: p.name, value: '' }));
      }

      // fetch typed-ish groups via the generic group endpoint (returns array of {name, value})
      const typedNames = ['AllgemeineParameter', 'Ventilkonfiguration', 'Konfiguration_Langzeittest', 'Konfiguration_Detailtest'];
      for (const tn of typedNames) {
        try {
          // keep '/' characters unencoded so server catch-all route receives subgroups correctly
          const safeTn = encodeURIComponent(tn).replace(/%2F/g, '/');
          const tret = await axios.get(`${apiBase}/api/parameters/${blockIndex}/group/${safeTn}`);
          const tdata = tret.data;
          if (Array.isArray(tdata)) {
            // merge nodeId from mapping if available
            outGroups[tn] = (tdata || []).map((p: any) => {
              const mapped = (groups[tn] || []).find((m: any) => m.name === p.name);
              return { name: p.name, value: p.value, nodeId: mapped?.nodeId };
            });
          }
        } catch { }
      }

      // for each non-typed group, try to fetch group values (best-effort)
      for (const g of Object.keys(outGroups)) {
        if (typedNames.includes(g)) continue;
        try {
          const safeG = encodeURIComponent(g).replace(/%2F/g, '/');
          const gre = await axios.get(`${apiBase}/api/parameters/${blockIndex}/group/${safeG}`);
          // merge nodeId from mapping if available
          outGroups[g] = (gre.data || []).map((p: any) => {
            const mapped = (groups[g] || []).find((m: any) => m.name === p.name);
            return { name: p.name, value: p.value, nodeId: mapped?.nodeId };
          });
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
    } finally {
      setIsRefreshing(false);
    }
  }

  // -----------------------------
  // Datasets (stored parameter sets)
  // -----------------------------
  async function fetchParameterDatasets(): Promise<void> {
    setDatasetsLoading(true);
    try {
      const res = await axios.get(`${apiBase}/api/datasets`);
      setParameterDatasets(res.data || []);
    } catch (e) {
      console.error('fetchParameterDatasets', e);
    } finally {
      setDatasetsLoading(false);
    }
  }

  function getEditKey(blockIndex: number, group: string, name: string): string {
    return `${blockIndex}||${group}||${name}`;
  }

  async function readParam(blockIndex: number, group: string, name: string): Promise<void> {
    // Use the optimized single parameter read function
    await readSingleParamOnly(blockIndex, group, name);
  }

  async function readSingleParamOnly(blockIndex: number, group: string, name: string): Promise<void> {
    try {
      const res = await axios.get(`${apiBase}/api/parameters/${blockIndex}/value`, { params: { group, name } });
      const p = res.data;
      // Only update the edit field and live data for this specific parameter
      setEdits(prev => ({ ...prev, [getEditKey(blockIndex, group, p.name)]: p.value }));
      // Update only this parameter's live value in the blocks state
      setBlocks(prev => prev.map(block => {
        if (block.index !== blockIndex) return block;
        const newGroups = { ...block.groups };
        if (newGroups[group]) {
          newGroups[group] = newGroups[group].map(param => 
            param.name === name ? { ...param, value: p.value } : param
          );
        }
        return { ...block, groups: newGroups };
      }));
    } catch (e) {
      console.error('Read param failed', e);
      alert('Read failed. See console.');
    }
  }

  async function writeParam(blockIndex: number, group: string, name: string): Promise<void> {
    try {
      const key = getEditKey(blockIndex, group, name);
      const value = edits[key] ?? '';
      await axios.post(`${apiBase}/api/parameters/${blockIndex}/value`, { value }, { params: { group, name } });
      // Read back only this single parameter instead of refreshing the entire block
      await readSingleParamOnly(blockIndex, group, name);
    } catch (e) {
      console.error('Write param failed', e);
      alert('Write failed. See console.');
    }
  }

  async function saveParameterDataset(selectedBlock: number): Promise<void> {
    const b = blocks.find(x => x.index === selectedBlock);
    if (!b) return;
    
    // Open modal for dataset configuration
    setSaveModalData({ 
      name: `Snapshot_${selectedBlock}_${new Date().toISOString()}`, 
      comment: '', 
      type: ParameterSetType.All,
      blockIndex: selectedBlock 
    });
    setShowSaveModal(true);
  }

  async function confirmSaveDataset(): Promise<void> {
    const { name, comment, type, blockIndex } = saveModalData;
    if (!name.trim()) {
      alert('Please enter a name for the dataset');
      return;
    }

    const b = blocks.find(x => x.index === blockIndex);
    if (!b) return;

    // Filter the block based on the selected type
    let filteredBlock = b;
    if (type !== ParameterSetType.All) {
      const targetGroup = TYPE_OPTIONS.find(opt => opt.value === type)?.group;
      if (targetGroup && b?.groups) {
        // Create a filtered block with only the target group
        filteredBlock = {
          ...b,
          groups: {
            [targetGroup]: b.groups[targetGroup]
          }
        };
        
        // Verify the group exists
        if (!b.groups[targetGroup]) {
          alert(`Warnung: Gruppe '${targetGroup}' nicht gefunden im aktuellen Block!`);
          return;
        }
      }
    }
    
    // send as legacy dataset shape to /api/datasets
    try {
      // Note: blockIndex is not sent to API - datasets are now block-independent
      await axios.post(`${apiBase}/api/datasets`, { 
        name, 
        comment, 
        type, 
        block: filteredBlock 
      });
      alert(`Dataset saved with type: ${type}`);
      setShowSaveModal(false);
    } catch (e) {
      console.error('saveParameterDataset', e);
      alert('Save dataset failed');
    }
    await fetchParameterDatasets();
  }

  // UI-friendly alias kept for backwards compatibility with older callers
  function saveDataset(blockIndex: number): Promise<void> {
    return saveParameterDataset(blockIndex);
  }

  async function loadDataset(id: number): Promise<void> {
    try {
      const res = await axios.get(`${apiBase}/api/datasets/${id}`);
      const payload = res.data?.payload;
      if (!payload) { alert('Dataset has no payload'); return; }
      let obj = null;
      try { obj = JSON.parse(payload); } catch { obj = payload; }
      
      // Only populate edits from loaded dataset - do NOT overwrite live values in blocks
      const newEdits = { ...edits };
      const groups = obj.groups || obj;
      if (groups) {
        for (const [g, list] of Object.entries(groups)) {
          for (const p of list as any[]) {
            newEdits[`${selectedBlock}||${g}||${p.name}`] = p.value;
          }
        }
      }
      setEdits(newEdits);
      alert('Dataset loaded into edit fields (live data preserved)');
    } catch (e) {
      console.error('loadParameterDataset', e);
      alert('Load parameter dataset failed');
    }
  }

  // alias used by UI
  function loadParameterDataset(id: number): Promise<void> {
    return loadDataset(id);
  }

  async function writeParameterDatasetToOpc(id: number): Promise<void> {
    if (!confirm('Write this parameter set to the OPC UA device?')) return;
    try {
      const res = await axios.post(`${apiBase}/api/datasets/${id}/write`);
      if (res.status >= 200 && res.status < 300) {
        alert('Dataset written to OPC UA');
      } else {
        alert('Write failed: ' + res.status);
      }
    } catch (e) {
      console.error('writeParameterDatasetToOpc', e);
      alert('Write parameter dataset failed');
    }
  }

  // alias used by UI
  function writeDatasetToOpc(id: number): Promise<void> {
    return writeParameterDatasetToOpc(id);
  }

  async function deleteParameterDataset(id: number): Promise<void> {
    if (!confirm('Delete dataset?')) return;
    try {
      await axios.delete(`${apiBase}/api/datasets/${id}`);
      fetchParameterDatasets();
    } catch (e) {
      console.error('deleteDataset', e);
      alert('Delete failed');
    }
  }

  // alias used by UI
  function deleteDataset(id: number): Promise<void> {
    return deleteParameterDataset(id);
  }

  async function writeBlockToOpc(selectedBlock: number): Promise<void> {
    const b = blocks.find(x => x.index === selectedBlock);
    if (!b) return;
    await axios.post(`${apiBase}/api/parameters/${selectedBlock}`, b);
    alert('Write requested');
  }

  // read a single group for the block and merge into state
  async function readGroup(blockIndex: number, groupName: string): Promise<void> {
    const gKey = `${blockIndex}||${groupName}`;
    setBusyGroups(prev => ({ ...prev, [gKey]: true }));
    try {
      const safe = encodeURIComponent(groupName).replace(/%2F/g, '/');
      const gre = await axios.get(`${apiBase}/api/parameters/${blockIndex}/group/${safe}`);
      // try to preserve existing nodeId from current state mapping (best-effort)
      const currentBlock = blocks.find(b => b.index === blockIndex);
      const list = (gre.data || []).map((p: any) => {
        const existingGroup = currentBlock?.groups?.[groupName] || [];
        const existing = existingGroup.find((e: any) => e.name === p.name);
        return { name: p.name, value: p.value, nodeId: existing?.nodeId };
      });
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
    } finally {
      setBusyGroups(prev => ({ ...prev, [gKey]: false }));
    }
  }

  // write the whole group (uses generic POST /group/{name})
  async function writeGroup(blockIndex: number, groupName: string): Promise<void> {
    if (!confirm(`Write ${groupName} for this block to the OPC UA device?`)) return;
    const gKey = `${blockIndex}||${groupName}`;
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
    setBusyGroups(prev => ({ ...prev, [gKey]: true }));
    try {
      const safe = encodeURIComponent(groupName).replace(/%2F/g, '/');
      await axios.post(`${apiBase}/api/parameters/${blockIndex}/group/${safe}`, parameters);
      alert(`${groupName} write requested`);
      try { await readGroup(blockIndex, groupName); } catch { /* ignore */ }
    } catch (e) {
      console.error('writeGroup failed', e);
      alert('Write failed');
    } finally {
      setBusyGroups(prev => ({ ...prev, [gKey]: false }));
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

      <div style={{ height: 12 }} />

      {/* Live Panel */}
      {paramInnerTab === 'live' && (
        <ParameterLiveDataPanel
          selectedBlock={selectedBlock}
          blocks={blocks}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          isRefreshing={isRefreshing}
          refreshBlock={refreshBlock}
          saveDataset={saveDataset}
          writeBlockToOpc={writeBlockToOpc}
          readGroup={readGroup}
          writeGroup={writeGroup}
          readParam={readParam}
          writeParam={writeParam}
          edits={edits}
          getEditKey={getEditKey}
          busyGroups={busyGroups}
          formatValue={formatValue}
          setEdits={setEdits}
        />
      )}

      <div style={{ height: 12 }} />

      {/* Datasets Panel */}
      {paramInnerTab === 'stored' && (
        <ParameterDataSetPanel
          parameterDatasets={parameterDatasets}
          datasetsLoading={datasetsLoading}
          loadParameterDataset={loadParameterDataset}
          writeDatasetToOpc={writeDatasetToOpc}
          deleteDataset={deleteDataset}
        />
      )}

      {/* Save Dataset Modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Save Parameter Dataset</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>
                Dataset Name: *
              </label>
              <input
                type="text"
                value={saveModalData.name}
                onChange={(e) => setSaveModalData({ ...saveModalData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>
                Comment:
              </label>
              <input
                type="text"
                value={saveModalData.comment}
                onChange={(e) => setSaveModalData({ ...saveModalData, comment: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>
                Parameter Set Type: *
              </label>
              <select
                value={saveModalData.type}
                onChange={(e) => setSaveModalData({ ...saveModalData, type: e.target.value as ParameterSetType })}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveDataset}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Save Dataset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
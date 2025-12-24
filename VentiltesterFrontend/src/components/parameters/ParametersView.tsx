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
    
    // Show a custom dialog for name, comment, and type
    const name = prompt('Name for dataset', `Snapshot_${selectedBlock}_${new Date().toISOString()}`) || '';
    if (!name) return; // User cancelled
    
    const comment = prompt('Comment (optional)', '') || '';
    
    // Ask for type - show options based on requirements
    const typeOptions = [
      'All',
      'VentilAnsteuerparameter',
      'VentilLangzeittestparameter',
      'VentilDetailtestparameter',
      'VentilEinzeltestparameter'
    ];
    
    const typeChoice = prompt(
      'Select parameter set type:\n' +
      '1 = All (all parameters)\n' +
      '2 = VentilAnsteuerparameter (Ventilkonfiguration/Ansteuerparameter)\n' +
      '3 = VentilLangzeittestparameter (Ventilkonfiguration/Langzeittest)\n' +
      '4 = VentilDetailtestparameter (Ventilkonfiguration/Detailtest)\n' +
      '5 = VentilEinzeltestparameter (Ventilkonfiguration/Einzeltest)\n\n' +
      'Enter number (1-5):',
      '1'
    );
    
    const typeIndex = parseInt(typeChoice || '1', 10) - 1;
    const type = typeOptions[Math.max(0, Math.min(typeIndex, typeOptions.length - 1))];
    
    // Filter the block based on the selected type
    let filteredBlock = b;
    if (type !== 'All') {
      // Map type to the specific group name
      const groupMapping: { [key: string]: string } = {
        'VentilAnsteuerparameter': 'Ventilkonfiguration/Ansteuerparameter',
        'VentilLangzeittestparameter': 'Ventilkonfiguration/Langzeittest',
        'VentilDetailtestparameter': 'Ventilkonfiguration/Detailtest',
        'VentilEinzeltestparameter': 'Ventilkonfiguration/Einzeltest'
      };
      
      const targetGroup = groupMapping[type];
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
    
    // send as legacy dataset shape to /api/datasets (supports { block: ... } for backwards compatibility)
    try {
      await axios.post(`${apiBase}/api/datasets`, { 
        name, 
        comment, 
        blockIndex: selectedBlock, 
        type, 
        block: filteredBlock 
      });
      alert(`Dataset saved with type: ${type}`);
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
    </div>
  );
}
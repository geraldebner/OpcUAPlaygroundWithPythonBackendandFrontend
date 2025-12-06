import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CommandsMeasurementsViewProps } from '../types';
import CommandsPanel from './shared/CommandsPanel';

interface Measurement {
  status?: {
    blockIndex: number;
    status: string;
    datenReady: boolean;
  };
  allStatus?: Array<{
    blockIndex: number;
    status: string;
    datenReady: boolean;
  }>;
  block?: {
    ventils: Array<{
      index: number;
      name: string;
      value: any;
    }>;
  };
  all?: Array<{
    blockIndex: number;
    ventils: Array<{
      index: number;
      name: string;
      value: any;
    }>;
  }>;
}

interface Snapshot {
  id: number;
  name: string;
  createdAt: string;
  comment?: string;
  identifierNumber?: number;
}

export default function CommandsMeasurementsView({ apiBase, selectedBlock }: CommandsMeasurementsViewProps) {
  function formatValue(v: any): string {
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
  
  const [measurements, setMeasurements] = useState<Measurement>({});
  const [liveData, setLiveData] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotName, setSnapshotName] = useState<string>('');
  const [snapshotComment, setSnapshotComment] = useState<string>('');
  const [snapshotIdentifier, setSnapshotIdentifier] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalJson, setModalJson] = useState<string>('');
  const [modalTitle, setModalTitle] = useState<string>('');
  
  // Group snapshot modal state
  const [showGroupSnapshotModal, setShowGroupSnapshotModal] = useState<boolean>(false);
  const [groupSnapshotGroup, setGroupSnapshotGroup] = useState<string>('');
  const [groupSnapshotName, setGroupSnapshotName] = useState<string>('');
  const [groupSnapshotComment, setGroupSnapshotComment] = useState<string>('');
  const [groupSnapshotIdentifier, setGroupSnapshotIdentifier] = useState<string>('');

  // Auto-refresh state: track which groups have auto-refresh enabled
  const [autoRefreshGroups, setAutoRefreshGroups] = useState<Set<string>>(new Set());

  // Group status messages: track success/error messages with timestamps for each group
  const [groupStatusMessages, setGroupStatusMessages] = useState<Map<string, {message: string, isError: boolean, timestamp: string}>>(new Map());

  // Update status message for a group
  function updateGroupStatus(groupName: string, message: string, isError: boolean): void {
    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    setGroupStatusMessages(prev => {
      const newMap = new Map(prev);
      newMap.set(groupName, { message, isError, timestamp });
      return newMap;
    });
  }

  // Toggle auto-refresh for a specific group
  function toggleAutoRefresh(groupName: string): void {
    setAutoRefreshGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  }

  // Auto-refresh effect: reads groups once per second if enabled
  useEffect(() => {
    if (autoRefreshGroups.size === 0) return;

    const intervalId = setInterval(async () => {
      autoRefreshGroups.forEach(async (groupName) => {
        try {
          await readWholeGroup(groupName);
        } catch (e) {
          console.error(`Auto-refresh failed for group ${groupName}:`, e);
        }
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [autoRefreshGroups, selectedBlock, apiBase, liveData]);

  async function fetchLiveData(): Promise<void> {
    try {
      // DEV-TRACE: log when CommandsMeasurementsView requests parameter list
      console.debug('[API CALL] CommandsMeasurementsView -> GET /api/parameters');
      const res = await axios.get(`${apiBase}/api/parameters`);
      const data = res.data || [];
      const block = data.find((b: any) => b.index === selectedBlock) || null;
      setLiveData(block);
    } catch (e) {
      console.error('fetchLiveData', e);
    }
  }

  useEffect(() => {
    // load live data when component mounts or selectedBlock changes
    fetchLiveData();
  }, [selectedBlock, apiBase]);

  async function readSingleParameter(group: string, name: string): Promise<void> {
    try {
      const res = await axios.get(`${apiBase}/api/parameters/${selectedBlock}/value`, { params: { group, name } });
      const p = res.data;
      // update liveData locally
      setLiveData((prev: any) => {
        if (!prev) return prev;
        const g = { ...(prev.groups || {}) };
        if (!g[group]) return prev;
        const list = g[group].map((item: any) => item.name === p.name ? { ...item, value: p.value } : item);
        g[group] = list;
        return { ...prev, groups: g };
      });
    } catch (e) {
      console.error('readSingleParameter', e);
      alert('Read failed. See console.');
    }
  }

  async function readWholeGroup(group: string): Promise<void> {
    try {
      if (!liveData?.groups?.[group]) {
        updateGroupStatus(group, 'Group not found in live data', true);
        return;
      }

      const parameters = liveData.groups[group];
      let successCount = 0;
      let errorCount = 0;
      
      const readPromises = parameters.map(async (param: any) => {
        try {
          const res = await axios.get(`${apiBase}/api/parameters/${selectedBlock}/value`, { 
            params: { group, name: param.name } 
          });
          successCount++;
          return { name: param.name, value: res.data.value, success: true };
        } catch (e) {
          console.warn(`Failed to read parameter ${param.name} in group ${group}:`, e);
          errorCount++;
          return { name: param.name, value: param.value, success: false }; // keep current value on error
        }
      });

      const results = await Promise.all(readPromises);
      
      // Update liveData with all the new values
      setLiveData((prev: any) => {
        if (!prev) return prev;
        const g = { ...(prev.groups || {}) };
        if (!g[group]) return prev;
        
        const updatedGroup = g[group].map((item: any) => {
          const result = results.find(r => r.name === item.name);
          return result ? { ...item, value: result.value } : item;
        });
        
        g[group] = updatedGroup;
        return { ...prev, groups: g };
      });
      
      // Show appropriate status based on success/error counts
      if (errorCount === results.length) {
        updateGroupStatus(group, 'Failed to read all parameters (OPC UA server not connected)', true);
      } else if (errorCount > 0) {
        updateGroupStatus(group, `Partially read: ${successCount} succeeded, ${errorCount} failed`, true);
      } else {
        updateGroupStatus(group, `Successfully read ${results.length} parameters`, false);
      }
    } catch (e) {
      console.error('readWholeGroup', e);
      updateGroupStatus(group, 'Failed to read group', true);
    }
  }

  async function listSnapshots(): Promise<void> {
    try {
      const res = await axios.get(`${apiBase}/api/measurementsets`, { params: { blockIndex: selectedBlock } });
      setSnapshots(res.data || []);
    } catch (e) {
      console.error('listSnapshots', e);
      alert('Failed to list snapshots');
    }
  }

  async function saveSnapshot(): Promise<void> {
    try {
      const payloadObj = measurements.block || liveData || {};
      if (!payloadObj || Object.keys(payloadObj).length === 0) {
        alert('No block data available to save. Refresh Block Data or Live Data first.');
        return;
      }
      
      // Parse identifier number if provided
      const identifierNumber = snapshotIdentifier.trim() ? parseInt(snapshotIdentifier.trim()) : undefined;
      if (snapshotIdentifier.trim() && isNaN(identifierNumber!)) {
        alert('Identifier number must be a valid integer.');
        return;
      }
      
      const body = {
        name: snapshotName && snapshotName.length ? snapshotName : `Snapshot ${new Date().toISOString()}`,
        blockIndex: selectedBlock,
        comment: snapshotComment.trim() || undefined,
        identifierNumber: identifierNumber,
        jsonPayload: JSON.stringify(payloadObj),
      };
      const res = await axios.post(`${apiBase}/api/measurementsets`, body);
      if (res.status >= 200 && res.status < 300) {
        alert('Snapshot saved');
        setSnapshotName('');
        setSnapshotComment('');
        setSnapshotIdentifier('');
        listSnapshots();
      } else {
        alert('Save failed: ' + res.status);
      }
    } catch (e) {
      console.error('saveSnapshot', e);
      alert('Save snapshot failed');
    }
  }

  async function saveGroupSnapshot(group: string): Promise<void> {
    try {
      if (!liveData?.groups?.[group]) {
        alert(`Group '${group}' not found in live data`);
        return;
      }

      const groupData = {
        groups: {
          [group]: liveData.groups[group]
        }
      };

      // Parse identifier number if provided
      const identifierNumber = groupSnapshotIdentifier.trim() ? parseInt(groupSnapshotIdentifier.trim()) : undefined;
      if (groupSnapshotIdentifier.trim() && isNaN(identifierNumber!)) {
        alert('Identifier number must be a valid integer.');
        return;
      }

      const body = {
        name: groupSnapshotName.trim() || `${group}_${new Date().toISOString()}`,
        blockIndex: selectedBlock,
        comment: groupSnapshotComment.trim() || undefined,
        identifierNumber: identifierNumber,
        jsonPayload: JSON.stringify(groupData),
      };
      
      const res = await axios.post(`${apiBase}/api/measurementsets`, body);
      if (res.status >= 200 && res.status < 300) {
        alert(`Group '${group}' snapshot saved successfully`);
        setShowGroupSnapshotModal(false);
        setGroupSnapshotName('');
        setGroupSnapshotComment('');
        setGroupSnapshotIdentifier('');
        listSnapshots();
      } else {
        alert('Save failed: ' + res.status);
      }
    } catch (e) {
      console.error('saveGroupSnapshot', e);
      alert('Save group snapshot failed');
    }
  }

  function openGroupSnapshotModal(group: string): void {
    setGroupSnapshotGroup(group);
    setGroupSnapshotName(`${group}_${new Date().toISOString().substring(0, 19)}`);
    setGroupSnapshotComment('');
    
    // Auto-fill MessID from the group if available
    let messId = '';
    if (liveData?.groups?.[group]) {
      const messIdParam = liveData.groups[group].find((p: any) => 
        p.name && (p.name.includes('MessID') || p.name.includes('MessId'))
      );
      if (messIdParam && messIdParam.value != null) {
        messId = String(messIdParam.value);
      }
    }
    setGroupSnapshotIdentifier(messId);
    setShowGroupSnapshotModal(true);
  }

  async function previewSnapshot(id: number, name?: string): Promise<void> {
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

  async function restoreSnapshot(id: number): Promise<void> {
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
    } catch (e: any) {
      console.error('restoreSnapshot', e);
      const msg = e?.response?.data ?? e.message ?? String(e);
      alert('Restore error: ' + JSON.stringify(msg));
    }
  }

  async function deleteSnapshot(id: number): Promise<void> {
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
        <CommandsPanel apiBase={apiBase} selectedBlock={selectedBlock} compact={true} />
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
          
          {showGroupSnapshotModal && (
            <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
              <div style={{background:'#fff',padding:24,width:'500px',borderRadius:'8px',boxShadow:'0 4px 12px rgba(0,0,0,0.3)'}}>
                <div style={{marginBottom:16}}>
                  <h4 style={{margin:0}}>Save Group Snapshot: {groupSnapshotGroup}</h4>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div>
                    <label style={{display:'block',marginBottom:4,fontSize:14,fontWeight:'bold'}}>Name:</label>
                    <input 
                      type="text"
                      value={groupSnapshotName} 
                      onChange={e=>setGroupSnapshotName(e.target.value)}
                      style={{width:'100%',padding:'8px',border:'1px solid #ccc',borderRadius:'4px'}}
                      placeholder="Snapshot name"
                    />
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:4,fontSize:14,fontWeight:'bold'}}>Comment:</label>
                    <textarea 
                      value={groupSnapshotComment} 
                      onChange={e=>setGroupSnapshotComment(e.target.value)}
                      style={{width:'100%',padding:'8px',border:'1px solid #ccc',borderRadius:'4px',resize:'vertical',minHeight:'60px'}}
                      placeholder="Optional comment..."
                    />
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:4,fontSize:14,fontWeight:'bold'}}>Identifier Number:</label>
                    <input 
                      type="text"
                      value={groupSnapshotIdentifier} 
                      onChange={e=>setGroupSnapshotIdentifier(e.target.value)}
                      style={{width:'150px',padding:'8px',border:'1px solid #ccc',borderRadius:'4px'}}
                      placeholder="Optional ID number"
                    />
                  </div>
                  <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
                    <button 
                      onClick={()=>setShowGroupSnapshotModal(false)}
                      style={{padding:'8px 16px',border:'1px solid #ccc',background:'#f5f5f5',borderRadius:'4px'}}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={()=>saveGroupSnapshot(groupSnapshotGroup)}
                      style={{padding:'8px 16px',border:'none',background:'#007bff',color:'white',borderRadius:'4px'}}
                    >
                      Save Snapshot
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

      <div style={{borderTop:'1px solid #ddd', marginTop:12, paddingTop:12}}>
        <h4>Measurements</h4>
        <div style={{display:'flex',gap:8,flexDirection:'row',alignItems:'center'}}>
          <button onClick={async ()=>{ const res = await axios.get(`${apiBase}/api/strommessung/status/${selectedBlock}`); setMeasurements(prev=>({ ...prev, status: res.data })); }}>Block Status</button>
          <button onClick={async ()=>{ const res = await axios.get(`${apiBase}/api/strommessung/status`); setMeasurements(prev=>({ ...prev, allStatus: res.data })); }}>All Status</button>
          <button onClick={async ()=>{ const res = await axios.get(`${apiBase}/api/strommessung/block/${selectedBlock}`); setMeasurements(prev=>({ ...prev, block: res.data })); }}>Block Data</button>
          <button onClick={async ()=>{ const res = await axios.get(`${apiBase}/api/strommessung/all`); setMeasurements(prev=>({ ...prev, all: res.data })); }}>All Data</button>
        </div>

        <div style={{marginTop:10, padding:8, borderTop:'1px dashed #ccc'}}>
          <h5>Snapshots</h5>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input placeholder="Snapshot name" value={snapshotName} onChange={e=>setSnapshotName(e.target.value)} style={{flex:1}} />
              <input placeholder="Identifier number (optional)" value={snapshotIdentifier} onChange={e=>setSnapshotIdentifier(e.target.value)} style={{width:'150px'}} />
              <button onClick={saveSnapshot}>Save Snapshot</button>
              <button onClick={listSnapshots}>List Snapshots</button>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input placeholder="Comment (optional)" value={snapshotComment} onChange={e=>setSnapshotComment(e.target.value)} style={{flex:1}} />
            </div>
          </div>
          <div style={{marginTop:8}}>
            {snapshots.length === 0 && <div style={{fontSize:12,color:'#666'}}>No snapshots. Click "List Snapshots" to refresh.</div>}
            {snapshots.map(s => (
              <div key={s.id} style={{display:'flex',gap:8,alignItems:'center',padding:'6px 0',borderBottom:'1px solid #eee'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <b>{s.name}</b>
                    {s.identifierNumber && <span style={{backgroundColor:'#e3f2fd',color:'#1976d2',padding:'2px 6px',borderRadius:'4px',fontSize:'11px'}}>#{s.identifierNumber}</span>}
                    <span style={{color:'#666'}}>({new Date(s.createdAt).toLocaleString()})</span>
                  </div>
                  {s.comment && <div style={{fontSize:12,color:'#666',fontStyle:'italic',marginTop:2}}>{s.comment}</div>}
                </div>
                <div>
                  <button onClick={()=>previewSnapshot(s.id, s.name)}>Preview</button>
                  <button style={{marginLeft:6}} onClick={()=>restoreSnapshot(s.id)}>Restore</button>
                  <button style={{marginLeft:6}} onClick={()=>deleteSnapshot(s.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

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
            Object.keys(liveData.groups).filter((g: string) => {
              const n = (g||'').toLowerCase();
              return n.includes('daten') || n.includes('strom') || n.includes('kommand');
            }).map((g: string) => (
              <div key={g} className="group-card" style={{marginBottom: '16px', border: '1px solid #ddd', padding: '12px', borderRadius: '4px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px'}}>
                  <h4 style={{margin: '0'}}>{g}</h4>
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <button 
                      onClick={() => readWholeGroup(g)}
                      style={{fontSize: '12px', padding: '4px 8px'}}
                      title={`Read all ${liveData.groups[g].length} parameters in this group`}
                    >
                      Read Group
                    </button>
                    <label style={{fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'}}>
                      <input 
                        type="checkbox"
                        checked={autoRefreshGroups.has(g)}
                        onChange={() => toggleAutoRefresh(g)}
                        title="Auto-refresh this group every second"
                      />
                      Auto
                    </label>
                    <button 
                      onClick={() => openGroupSnapshotModal(g)}
                      style={{fontSize: '12px', padding: '4px 8px'}}
                      title={`Save snapshot of only the ${g} group`}
                    >
                      Save Snapshot
                    </button>
                    {groupStatusMessages.has(g) && (
                      <span style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: groupStatusMessages.get(g)?.isError ? '#ffebee' : '#e8f5e9',
                        color: groupStatusMessages.get(g)?.isError ? '#c62828' : '#2e7d32',
                        whiteSpace: 'nowrap'
                      }}>
                        {groupStatusMessages.get(g)?.message} ({groupStatusMessages.get(g)?.timestamp})
                      </span>
                    )}
                  </div>
                </div>
                <table className="param-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                  <tbody>
                    {liveData.groups[g].map((p: any, i: number) => (
                      <tr key={p.name} style={{borderBottom: '1px solid #eee'}}>
                        <td className="param-name" style={{padding: '4px 8px', fontWeight: 'bold'}}>{p.name}</td>
                        <td style={{fontSize:12,color:'#333', padding: '4px 8px'}}>Live: <code>{formatValue(p.value)}</code></td>
                        <td style={{padding: '4px 8px'}}>
                          <button onClick={() => readSingleParameter(g, p.name)} style={{fontSize: '11px', padding: '2px 6px'}}>Read</button>
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
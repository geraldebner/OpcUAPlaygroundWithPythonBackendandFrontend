import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HistoricalDataSetsViewProps } from '../types';

interface Snapshot {
  id: number;
  name: string;
  createdAt: string;
  comment?: string;
  identifierNumber?: number;
}

interface LoadedData {
  id: number;
  name: string;
  comment?: string;
  identifierNumber?: number;
  createdAt: string;
  data: any;
}

export default function HistoricalDataSetsView({ apiBase, selectedBlock }: HistoricalDataSetsViewProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [commentFilter, setCommentFilter] = useState<string>('');
  const [identifierFilter, setIdentifierFilter] = useState<string>('');
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalJson, setModalJson] = useState<string>('');
  const [modalTitle, setModalTitle] = useState<string>('');

  // Load snapshots when component mounts or selectedBlock changes
  useEffect(() => {
    if (selectedBlock !== null) {
      loadSnapshots();
    }
  }, [selectedBlock, apiBase]);

  async function loadSnapshots(): Promise<void> {
    if (selectedBlock === null) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/api/measurementsets`, { 
        params: { blockIndex: selectedBlock } 
      });
      setSnapshots(res.data || []);
    } catch (e) {
      console.error('Failed to load snapshots', e);
      alert('Failed to load historical datasets');
    } finally {
      setLoading(false);
    }
  }

  async function loadDataset(id: number): Promise<void> {
    try {
      const res = await axios.get(`${apiBase}/api/measurementsets/${id}`);
      const dataset = res.data;
      if (!dataset) {
        alert('Dataset not found');
        return;
      }

      let parsedData = {};
      try {
        parsedData = JSON.parse(dataset.payload);
      } catch (e) {
        console.warn('Failed to parse dataset payload:', e);
        parsedData = dataset.payload;
      }

      const loadedDataset: LoadedData = {
        id: dataset.id,
        name: dataset.name,
        comment: dataset.comment,
        identifierNumber: dataset.identifierNumber,
        createdAt: dataset.createdAt,
        data: parsedData
      };

      setLoadedData(loadedDataset);
    } catch (e) {
      console.error('Failed to load dataset', e);
      alert('Failed to load dataset');
    }
  }

  async function deleteDataset(id: number): Promise<void> {
    if (!confirm('Delete this historical dataset? This action cannot be undone.')) return;
    
    try {
      await axios.delete(`${apiBase}/api/measurementsets/${id}`);
      setSnapshots(prev => prev.filter(s => s.id !== id));
      
      // Clear loaded data if it's the one being deleted
      if (loadedData?.id === id) {
        setLoadedData(null);
      }
      
      alert('Dataset deleted successfully');
    } catch (e) {
      console.error('Failed to delete dataset', e);
      alert('Failed to delete dataset');
    }
  }

  function previewDataset(id: number, name?: string): void {
    const snapshot = snapshots.find(s => s.id === id);
    if (!snapshot) return;

    loadDataset(id).then(() => {
      if (loadedData) {
        const pretty = JSON.stringify(loadedData.data, null, 2);
        setModalTitle(name || `Dataset ${id}`);
        setModalJson(pretty);
        setShowModal(true);
      }
    });
  }

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

  // Filter snapshots based on comment and identifier
  const filteredSnapshots = snapshots.filter(snapshot => {
    const commentMatch = !commentFilter.trim() || 
      (snapshot.comment && snapshot.comment.toLowerCase().includes(commentFilter.toLowerCase()));
    
    const identifierMatch = !identifierFilter.trim() || 
      (snapshot.identifierNumber && snapshot.identifierNumber.toString().includes(identifierFilter));
    
    return commentMatch && identifierMatch;
  });

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3>Historical Data Sets - Block {selectedBlock}</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
          <input
            placeholder="Filter by comment..."
            value={commentFilter}
            onChange={e => setCommentFilter(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', width: '200px' }}
          />
          <input
            placeholder="Filter by identifier..."
            value={identifierFilter}
            onChange={e => setIdentifierFilter(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', width: '150px' }}
          />
          <button onClick={loadSnapshots} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <span style={{ color: '#666', fontSize: '14px' }}>
            Showing {filteredSnapshots.length} of {snapshots.length} datasets
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Dataset List */}
        <div style={{ flex: '1', minWidth: '400px' }}>
          <h4>Available Datasets</h4>
          {filteredSnapshots.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666', border: '1px dashed #ccc' }}>
              {snapshots.length === 0 ? 'No historical datasets found' : 'No datasets match the current filters'}
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd' }}>
              {filteredSnapshots.map(snapshot => (
                <div 
                  key={snapshot.id} 
                  style={{ 
                    padding: '12px', 
                    borderBottom: '1px solid #eee',
                    backgroundColor: loadedData?.id === snapshot.id ? '#f0f8ff' : 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <strong>{snapshot.name}</strong>
                        {snapshot.identifierNumber && (
                          <span style={{
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            #{snapshot.identifierNumber}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(snapshot.createdAt).toLocaleString()}
                      </div>
                      {snapshot.comment && (
                        <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
                          {snapshot.comment}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button 
                        onClick={() => loadDataset(snapshot.id)}
                        style={{ 
                          fontSize: '12px', 
                          padding: '4px 8px',
                          backgroundColor: loadedData?.id === snapshot.id ? '#007bff' : '#f8f9fa',
                          color: loadedData?.id === snapshot.id ? 'white' : 'black',
                          border: '1px solid #ccc',
                          borderRadius: '4px'
                        }}
                      >
                        Load
                      </button>
                      <button 
                        onClick={() => previewDataset(snapshot.id, snapshot.name)}
                        style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        Preview
                      </button>
                      <button 
                        onClick={() => deleteDataset(snapshot.id)}
                        style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loaded Data Display */}
        <div style={{ flex: '1', minWidth: '400px' }}>
          <h4>Loaded Dataset</h4>
          {loadedData ? (
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '12px' }}>
              <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '16px' }}>{loadedData.name}</strong>
                  {loadedData.identifierNumber && (
                    <span style={{
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      #{loadedData.identifierNumber}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Created: {new Date(loadedData.createdAt).toLocaleString()}
                </div>
                {loadedData.comment && (
                  <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
                    "{loadedData.comment}"
                  </div>
                )}
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {loadedData.data?.groups ? (
                  Object.keys(loadedData.data.groups).map(groupName => (
                    <div key={groupName} style={{ marginBottom: '16px' }}>
                      <h5 style={{ margin: '0 0 8px 0', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                        {groupName}
                      </h5>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #ddd' }}>Parameter</th>
                            <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #ddd' }}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadedData.data.groups[groupName].map((param: any, idx: number) => (
                            <tr key={idx}>
                              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                                {param.name}
                              </td>
                              <td style={{ padding: '6px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                                {formatValue(param.value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                ) : (
                  <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(loadedData.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#666', 
              border: '1px dashed #ccc',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>📊</div>
              <div>Select a dataset from the list to view its contents</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Historical data will be displayed here</div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            padding: 16,
            width: '80%',
            height: '80%',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: '1px solid #eee'
            }}>
              <h4 style={{ margin: 0 }}>{modalTitle}</h4>
              <button 
                onClick={() => setShowModal(false)}
                style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                Close
              </button>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
              {modalJson}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
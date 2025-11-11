import React from 'react';
import { Snapshot, LoadedData } from './types';

interface DatasetListProps {
  snapshots: Snapshot[];
  loadedData: LoadedData | null;
  loading: boolean;
  onLoadDataset: (id: number) => void;
  onPreviewDataset: (id: number, name?: string) => void;
  onDeleteDataset: (id: number) => void;
}

export default function DatasetList({
  snapshots,
  loadedData,
  loading,
  onLoadDataset,
  onPreviewDataset,
  onDeleteDataset
}: DatasetListProps) {
  return (
    <div style={{ flex: '1', minWidth: '400px' }}>
      <h4>Available Datasets</h4>
      {snapshots.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666', border: '1px dashed #ccc' }}>
          No historical datasets found
        </div>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd' }}>
          {snapshots.map(snapshot => (
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
                    onClick={() => onLoadDataset(snapshot.id)}
                    style={{ 
                      fontSize: '12px', 
                      padding: '4px 8px',
                      backgroundColor: loadedData?.id === snapshot.id ? '#007bff' : '#f8f9fa',
                      color: loadedData?.id === snapshot.id ? 'white' : 'black',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Load
                  </button>
                  <button 
                    onClick={() => onPreviewDataset(snapshot.id, snapshot.name)}
                    style={{ 
                      fontSize: '12px', 
                      padding: '4px 8px', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Preview
                  </button>
                  <button 
                    onClick={() => onDeleteDataset(snapshot.id)}
                    style={{ 
                      fontSize: '12px', 
                      padding: '4px 8px', 
                      border: '1px solid #dc3545', 
                      color: '#dc3545', 
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
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
  );
}

import React from 'react';
import { LoadedData } from './types';

interface LoadedDataDisplayProps {
  loadedData: LoadedData | null;
  onExportJSON: () => void;
  onExportCSV: () => void;
  formatValue: (v: any) => string;
}

export default function LoadedDataDisplay({
  loadedData,
  onExportJSON,
  onExportCSV,
  formatValue
}: LoadedDataDisplayProps) {
  if (!loadedData) {
    return (
      <div style={{ flex: '1', minWidth: '400px' }}>
        <h4>Loaded Dataset</h4>
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
      </div>
    );
  }

  return (
    <div style={{ flex: '1', minWidth: '400px' }}>
      <h4>Loaded Dataset</h4>
      <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '12px' }}>
        <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={onExportJSON}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Export to JSON"
              >
                📥 JSON
              </button>
              <button 
                onClick={onExportCSV}
                style={{ 
                  padding: '6px 12px', 
                  backgroundColor: '#17a2b8', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Export to CSV"
              >
                📥 CSV
              </button>
            </div>
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
    </div>
  );
}

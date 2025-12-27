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
      <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '12px' }}>
        <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '16px' }}>{loadedData.name}</strong>
              {loadedData.messID && (
                <span style={{
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  #{loadedData.messID}
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
          {loadedData.testRun && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#e8f5e9',
              border: '1px solid #c8e6c9',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '4px' }}>
                🔬 Prüflauf Information
              </div>
              <div style={{ fontSize: '11px', color: '#555', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>MessID:</span>
                <span>{loadedData.testRun.messID}</span>
                <span style={{ fontWeight: 'bold' }}>Typ:</span>
                <span>{loadedData.testRun.testType}</span>
                <span style={{ fontWeight: 'bold' }}>Status:</span>
                <span>{loadedData.testRun.status}</span>
                <span style={{ fontWeight: 'bold' }}>Gestartet:</span>
                <span>{new Date(loadedData.testRun.startedAt).toLocaleString()}</span>
                {loadedData.testRun.completedAt && (
                  <>
                    <span style={{ fontWeight: 'bold' }}>Beendet:</span>
                    <span>{new Date(loadedData.testRun.completedAt).toLocaleString()}</span>
                  </>
                )}
                {loadedData.testRun.comment && (
                  <>
                    <span style={{ fontWeight: 'bold' }}>Kommentar:</span>
                    <span>{loadedData.testRun.comment}</span>
                  </>
                )}
              </div>
            </div>
          )}
          {loadedData.testRun?.ventilConfigs && loadedData.messID && (() => {
            const ventilConfig = loadedData.testRun.ventilConfigs.find(
              vc => vc.ventilNumber === loadedData.messID
            );
            return ventilConfig ? (
              <div style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#e1f5fe',
                border: '1px solid #b3e5fc',
                borderRadius: '4px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#01579b', marginBottom: '4px' }}>
                  🔧 Ventil {loadedData.messID} Konfiguration
                </div>
                <div style={{ fontSize: '11px', color: '#555', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>Status:</span>
                  <span style={{ 
                    color: ventilConfig.enabled ? '#2e7d32' : '#d32f2f',
                    fontWeight: 'bold'
                  }}>
                    {ventilConfig.enabled ? '✓ Aktiviert' : '✗ Deaktiviert'}
                  </span>
                  {ventilConfig.comment && (
                    <>
                      <span style={{ fontWeight: 'bold' }}>Kommentar:</span>
                      <span>{ventilConfig.comment}</span>
                    </>
                  )}
                </div>
              </div>
            ) : null;
          })()}
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

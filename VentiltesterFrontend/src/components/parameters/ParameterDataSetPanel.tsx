import React from 'react';
import { ParameterDataSetPanelProps } from '../../types';

export default function ParameterDataSetPanel({ 
  parameterDatasets, 
  datasetsLoading, 
  loadParameterDataset, 
  writeDatasetToOpc, 
  deleteDataset 
}: ParameterDataSetPanelProps) {
  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, background: '#fff' }}>
      <h3 style={{ marginTop: 0 }}>Stored Parameter Datasets</h3>
      {datasetsLoading ? <div>Loading datasets…</div> : (
        <ul className="dataset-list">
          {parameterDatasets.map(ds => (
            <li key={ds.id} className="dataset-item">
              <div className="dataset-meta">
                <b>{ds.name}</b>
                <small style={{ marginLeft: 8 }}>{new Date(ds.createdAt).toLocaleString()}</small>
                {ds.comment && (
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' }}>
                    {ds.comment}
                  </div>
                )}
              </div>
              <div className="dataset-actions">
                <button onClick={() => loadParameterDataset(ds.id)}>Load into UI</button>
                <button onClick={() => writeDatasetToOpc(ds.id)} style={{ marginLeft: 8 }}>Write to OPC</button>
                <button style={{ marginLeft: 8 }} onClick={() => deleteDataset(ds.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
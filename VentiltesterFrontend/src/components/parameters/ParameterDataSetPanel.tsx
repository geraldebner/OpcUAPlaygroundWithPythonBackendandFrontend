import React, { useState } from 'react';
import { ParameterDataSetPanelProps } from '../../types';

export default function ParameterDataSetPanel({ 
  parameterDatasets, 
  datasetsLoading, 
  loadParameterDataset, 
  writeDatasetToOpc, 
  deleteDataset 
}: ParameterDataSetPanelProps) {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Get unique types from datasets
  const availableTypes = ['all', ...new Set(parameterDatasets.map(ds => ds.type || 'All'))];
  
  // Debug: log the available types
  console.log('Available types:', availableTypes);
  console.log('Datasets:', parameterDatasets.map(ds => ({ id: ds.id, name: ds.name, type: ds.type })));

  // Filter datasets by type
  const filteredDatasets = typeFilter === 'all' 
    ? parameterDatasets 
    : parameterDatasets.filter(ds => (ds.type || 'All') === typeFilter);

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>Stored Parameter Datasets</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="typeFilter" style={{ fontSize: 14, fontWeight: 'bold' }}>Filter by Type:</label>
          <select 
            id="typeFilter"
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '4px 8px', fontSize: 14, borderRadius: 4, border: '1px solid #ccc' }}
          >
            {availableTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: '#666' }}>
            ({filteredDatasets.length} of {parameterDatasets.length})
          </span>
        </div>
      </div>
      {datasetsLoading ? <div>Loading datasets…</div> : (
        <ul className="dataset-list">
          {filteredDatasets.map(ds => (
            <li key={ds.id} className="dataset-item">
              <div className="dataset-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b>{ds.name}</b>
                  <span style={{ 
                    fontSize: 11, 
                    padding: '2px 6px', 
                    borderRadius: 3, 
                    background: '#e3f2fd', 
                    color: '#1976d2',
                    fontWeight: 'bold'
                  }}>
                    {ds.type || 'All'}
                  </span>
                </div>
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
import React from 'react';
import { ParameterMappingPanelProps } from '../../types';

export default function ParameterMappingPanel({ 
  selectedBlock, 
  refreshBlock, 
  fetchMappingOnly, 
  isRefreshing, 
  mappingLoading 
}: ParameterMappingPanelProps) {
  return (
    <div style={{ marginTop: 12, padding: 12, border: '1px solid #ddd', borderRadius: 6, background: '#fafafa' }}>
      <h3 style={{ marginTop: 0 }}>Mapping</h3>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button 
          onClick={() => selectedBlock && refreshBlock(selectedBlock)} 
          disabled={isRefreshing}
        >
          Refresh mapping & live
        </button>
        <button onClick={fetchMappingOnly} disabled={mappingLoading}>
          Fetch mapping only
        </button>
        {isRefreshing && <span style={{ marginLeft: 8 }}>Refreshing…</span>}
        {mappingLoading && <span style={{ marginLeft: 8 }}>Loading mapping…</span>}
      </div>
    </div>
  );
}
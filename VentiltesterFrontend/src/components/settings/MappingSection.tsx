import React, { useState } from 'react';
import axios from 'axios';

interface MappingSectionProps {
  apiBase: string;
  selectedBlock: number | null;
  onMappingRefresh?: () => void;
}

export default function MappingSection({ apiBase, selectedBlock, onMappingRefresh }: MappingSectionProps) {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [mappingLoading, setMappingLoading] = useState<boolean>(false);

  async function refreshMapping(): Promise<void> {
    if (!selectedBlock) {
      alert('Please select a block first');
      return;
    }
    setIsRefreshing(true);
    try {
      await axios.get(`${apiBase}/api/mapping/${selectedBlock}`);
      alert('Mapping refreshed successfully');
      if (onMappingRefresh) {
        onMappingRefresh();
      }
    } catch (e) {
      console.error('refreshMapping failed', e);
      alert('Failed to refresh mapping');
    } finally {
      setIsRefreshing(false);
    }
  }

  async function fetchMappingOnly(): Promise<void> {
    if (!selectedBlock) {
      alert('Please select a block first');
      return;
    }
    setMappingLoading(true);
    try {
      await axios.get(`${apiBase}/api/mapping/${selectedBlock}`);
      alert('Mapping fetched successfully');
      if (onMappingRefresh) {
        onMappingRefresh();
      }
    } catch (e) {
      console.error('fetchMappingOnly failed', e);
      alert('Failed to fetch mapping');
    } finally {
      setMappingLoading(false);
    }
  }

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#1e3a5f', fontSize: '18px' }}>
        Mapping
      </h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          onClick={refreshMapping} 
          disabled={isRefreshing || !selectedBlock}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedBlock ? '#2196F3' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (isRefreshing || !selectedBlock) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: (isRefreshing || !selectedBlock) ? 0.6 : 1
          }}
        >
          Refresh mapping & live
        </button>
        <button 
          onClick={fetchMappingOnly} 
          disabled={mappingLoading || !selectedBlock}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedBlock ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (mappingLoading || !selectedBlock) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            opacity: (mappingLoading || !selectedBlock) ? 0.6 : 1
          }}
        >
          Fetch mapping only
        </button>
        {isRefreshing && <span style={{ fontSize: '14px', color: '#666' }}>Refreshing…</span>}
        {mappingLoading && <span style={{ fontSize: '14px', color: '#666' }}>Loading mapping…</span>}
      </div>
      {!selectedBlock && (
        <div style={{ marginTop: '12px', fontSize: '13px', color: '#f44336' }}>
          Please select a block to manage mapping
        </div>
      )}
    </div>
  );
}

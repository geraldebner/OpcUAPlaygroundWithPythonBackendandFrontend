import React from 'react';

interface CacheInfoProps {
  data: any;
  autoRefresh: boolean;
  setAutoRefresh: (value: boolean) => void;
}

export default function CacheInfo({ data, autoRefresh, setAutoRefresh }: CacheInfoProps) {
  return (
    <div style={{
      backgroundColor: '#e8f4f8',
      borderRadius: '8px',
      padding: '12px 16px',
      border: '1px solid #b3d9e6'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>🔄 Using Cached Data</strong>
          {data && (
            <span style={{ marginLeft: '12px', fontSize: '13px', color: '#666' }}>
              Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <span>Auto Refresh (2s)</span>
        </label>
      </div>
    </div>
  );
}

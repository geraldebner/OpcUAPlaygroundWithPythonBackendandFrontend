import React from 'react';

interface SystemStatusPanelProps {
  selectedBlock: number;
  messMode: number | null;
  operationMode: number | null;
  batteryStatus?: number;
  getMessModeText: (mode: number | null) => string;
  getOperationModeText: (mode: number | null) => string;
}

export default function SystemStatusPanel({
  selectedBlock,
  messMode,
  operationMode,
  batteryStatus,
  getMessModeText,
  getOperationModeText
}: SystemStatusPanelProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '2px solid #95a5a6'
    }}>
      <h2 style={{ margin: '0 0 12px 0', color: '#2c3e50', fontSize: '16px', fontWeight: 'bold' }}>
        📊 System Status - Block {selectedBlock}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
        {/* MessMode Status */}
        <div style={{
          padding: '12px',
          backgroundColor: messMode === 0 ? '#d4edda' : '#fff3cd',
          border: `2px solid ${messMode === 0 ? '#c3e6cb' : '#ffc107'}`,
          borderRadius: '6px'
        }}>
          <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '4px', fontSize: '12px' }}>
            Mess Mode:
          </div>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold',
            color: messMode === 0 ? '#155724' : '#856404'
          }}>
            {getMessModeText(messMode)} {messMode !== null && `(${messMode})`}
          </div>
        </div>

        {/* OperationMode Status */}
        <div style={{
          padding: '12px',
          backgroundColor: '#e8f4f8',
          border: '2px solid #b3d9e6',
          borderRadius: '6px'
        }}>
          <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '4px', fontSize: '12px' }}>
            Operation Mode:
          </div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0c5460' }}>
            {getOperationModeText(operationMode)} {operationMode !== null && `(${operationMode})`}
          </div>
        </div>

        {/* Battery Status */}
        {batteryStatus !== undefined && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f8f9fa',
            border: '2px solid #dee2e6',
            borderRadius: '6px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '4px', fontSize: '12px' }}>
              Batterie Status:
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#28a745' }}>
              {(batteryStatus * 100).toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

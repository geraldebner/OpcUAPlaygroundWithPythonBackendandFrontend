import React from 'react';

interface BlockSelectorProps {
  selectedBlock: number | null;
  onBlockChange: (block: number | null) => void;
  style?: React.CSSProperties;
  compact?: boolean;
}

export default function BlockSelector({ selectedBlock, onBlockChange, style, compact = false }: BlockSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: compact ? 8 : 12, alignItems: 'center', ...style }}>
      <label 
        htmlFor="blockSelect" 
        style={{ 
          fontSize: compact ? '13px' : '14px', 
          fontWeight: '500', 
          color: '#555',
          whiteSpace: 'nowrap'
        }}
      >
        {compact ? 'Block:' : 'Selected Block:'}
      </label>
      <select
        id="blockSelect"
        value={selectedBlock ?? ''}
        onChange={(e) => onBlockChange(e.target.value ? Number(e.target.value) : null)}
        style={{
          padding: compact ? '6px 10px' : '8px 12px',
          border: '1px solid #ccc',
          borderRadius: '6px',
          fontSize: compact ? '13px' : '14px',
          backgroundColor: 'white',
          cursor: 'pointer'
        }}
      >
        <option value="">-- Select Block --</option>
        {[1, 2, 3, 4].map(i => (
          <option key={i} value={i}>Block {i}</option>
        ))}
      </select>
    </div>
  );
}

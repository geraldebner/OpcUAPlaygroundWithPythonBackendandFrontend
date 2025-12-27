import React, { useCallback } from 'react';

interface EditableGroupsPanelProps {
  title: string;
  groups: Record<string, { name: string; value: string }[]>;
  setGroups: (g: Record<string, { name: string; value: string }[]>) => void;
  onDirty: (dirty: boolean) => void;
}

/**
 * Component to display and edit parameter groups.
 * Extracted as a separate component to prevent focus loss on parent re-renders.
 */
const EditableGroupsPanel = React.memo(function EditableGroupsPanel({
  title,
  groups,
  setGroups,
  onDirty
}: EditableGroupsPanelProps) {
  const updateValue = useCallback((groupKey: string, index: number, value: string) => {
    const updated = { ...groups };
    updated[groupKey] = [...updated[groupKey]];
    updated[groupKey][index] = { ...updated[groupKey][index], value };
    setGroups(updated);
    onDirty(true);
  }, [groups, setGroups, onDirty]);

  const groupKeys = Object.keys(groups);
  if (groupKeys.length === 0) return <div>No parameters available</div>;

  return (
    <div style={{
      marginTop: '8px',
      padding: '8px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      border: '1px solid #dee2e6'
    }}>
      <details style={{ cursor: 'pointer' }}>
        <summary style={{ fontWeight: 'bold', fontSize: '13px', color: '#495057' }}>
          {title} Parameter (editierbar)
        </summary>
        <div style={{ marginTop: '8px', paddingLeft: '8px' }}>
          {groupKeys.map((groupKey) => (
            <div key={groupKey} style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057', marginBottom: '6px' }}>
                {groupKey}
              </div>
              {groups[groupKey].map((param, idx) => (
                <div key={`${groupKey}-${idx}`} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                  <label style={{ minWidth: '150px', fontSize: '12px', color: '#333' }}>
                    {param.name}:
                  </label>
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => updateValue(groupKey, idx, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      fontSize: '12px'
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
});

export default EditableGroupsPanel;

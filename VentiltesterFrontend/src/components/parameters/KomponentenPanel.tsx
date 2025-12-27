import React, { useState } from 'react';
import axios from 'axios';
import EditableGroupsPanel from '../EditableGroupsPanel';
import SaveDatasetModal from './SaveDatasetModal';
import { Dataset } from '../../types';

interface KomponentenPanelProps {
  apiBase: string;
  komponentenSets: Dataset[];
  selectedKomponentenConfig: number | null;
  setSelectedKomponentenConfig: (id: number | null) => void;
  komponentenGroups: Record<string, { name: string; value: string }[]>;
  setKomponentenGroups: (g: Record<string, { name: string; value: string }[]>) => void;
  komponentenDirty: boolean;
  setKomponentenDirty: (d: boolean) => void;
  onSaveSuccess: () => void;
}

export default function KomponentenPanel({
  apiBase,
  komponentenSets,
  selectedKomponentenConfig,
  setSelectedKomponentenConfig,
  komponentenGroups,
  setKomponentenGroups,
  komponentenDirty,
  setKomponentenDirty,
  onSaveSuccess
}: KomponentenPanelProps) {
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);

  const getPayload = () => {
    return JSON.stringify({
      groups: Object.fromEntries(
        Object.entries(komponentenGroups).map(([k, arr]) => [k, arr.map(p => ({ name: p.name, value: p.value }))])
      )
    });
  };
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontWeight: 'bold' }}>Komponenten-Dataset:</label>
        <select
          value={selectedKomponentenConfig ?? ''}
          onChange={(e) => setSelectedKomponentenConfig(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4 }}
        >
          <option value="">— wählen —</option>
          {komponentenSets.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{ padding: '6px 10px' }}
        >Als neues Dataset speichern</button>
      </div>
      <EditableGroupsPanel
        title="Ventilkonfiguration Sensor-Regler"
        groups={komponentenGroups}
        setGroups={(g) => { setKomponentenGroups(g); setKomponentenDirty(true); }}
        onDirty={(d) => setKomponentenDirty(d)}
      />

      <SaveDatasetModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaveSuccess={onSaveSuccess}
        apiBase={apiBase}
        type="Komponenten"
        jsonPayload={getPayload()}
      />
    </div>
  );
}

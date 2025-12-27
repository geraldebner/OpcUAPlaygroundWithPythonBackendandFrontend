import React, { useState } from 'react';
import axios from 'axios';
import EditableGroupsPanel from '../EditableGroupsPanel';
import SaveDatasetModal from './SaveDatasetModal';
import { Dataset } from '../../types';

interface VentilparameterPanelProps {
  apiBase: string;
  ventilSets: Dataset[];
  selectedVentilConfig: number | null;
  setSelectedVentilConfig: (id: number | null) => void;
  ventilGroups: Record<string, { name: string; value: string }[]>;
  setVentilGroups: (g: Record<string, { name: string; value: string }[]>) => void;
  ventilDirty: boolean;
  setVentilDirty: (d: boolean) => void;
  onSaveSuccess: () => void;
}

export default function VentilparameterPanel({
  apiBase,
  ventilSets,
  selectedVentilConfig,
  setSelectedVentilConfig,
  ventilGroups,
  setVentilGroups,
  ventilDirty,
  setVentilDirty,
  onSaveSuccess
}: VentilparameterPanelProps) {
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);

  const getPayload = () => {
    const payload = {
      groups: Object.fromEntries(
        Object.entries(ventilGroups).map(([k, arr]) => [k, arr.map(p => ({ name: p.name, value: p.value }))])
      )
    };
    const jsonString = JSON.stringify(payload);
    console.log('Ventil payload:', jsonString);
    return jsonString;
  };
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontWeight: 'bold' }}>Ventil-Dataset:</label>
        <select
          value={selectedVentilConfig ?? ''}
          onChange={(e) => setSelectedVentilConfig(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4 }}
        >
          <option value="">— wählen —</option>
          {ventilSets.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{ padding: '6px 10px' }}
        >Als neues Dataset speichern</button>
      </div>
      <EditableGroupsPanel
        title="Ventilkonfiguration"
        groups={ventilGroups}
        setGroups={(g) => { setVentilGroups(g); setVentilDirty(true); }}
        onDirty={(d) => setVentilDirty(d)}
      />

      <SaveDatasetModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaveSuccess={onSaveSuccess}
        apiBase={apiBase}
        type="VentilAnsteuerparameter"
        jsonPayload={getPayload()}
        existingNames={ventilSets.map(s => s.name)}
      />
    </div>
  );
}

import React from 'react';
import axios from 'axios';
import EditableGroupsPanel from '../EditableGroupsPanel';
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
          onClick={async () => {
            if (!selectedVentilConfig) { alert('Kein Ventil-Dataset gewählt'); return; }
            const payload = {
              groups: Object.fromEntries(
                Object.entries(ventilGroups).map(([k, arr]) => [k, arr.map(p => ({ name: p.name, value: p.value }))])
              )
            };
            const name = `Ventilkonfig_${new Date().toISOString()}`;
            try {
              await axios.post(`${apiBase}/api/datasets`, { name, type: 'VentilAnsteuerparameter', jsonPayload: JSON.stringify(payload) });
              alert('Ventilparameter als neues Dataset gespeichert');
              onSaveSuccess();
            } catch (e) {
              console.error('Save Ventil dataset failed', e);
              alert('Speichern fehlgeschlagen');
            }
          }}
          style={{ padding: '6px 10px' }}
        >Als neues Dataset speichern</button>
      </div>
      <EditableGroupsPanel
        title="Ventilkonfiguration"
        groups={ventilGroups}
        setGroups={(g) => { setVentilGroups(g); setVentilDirty(true); }}
        onDirty={(d) => setVentilDirty(d)}
      />
    </div>
  );
}

import React from 'react';
import axios from 'axios';
import EditableGroupsPanel from '../EditableGroupsPanel';
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
          onClick={async () => {
            if (!selectedKomponentenConfig) { alert('Kein Komponenten-Dataset gewählt'); return; }
            const payload = {
              groups: Object.fromEntries(
                Object.entries(komponentenGroups).map(([k, arr]) => [k, arr.map(p => ({ name: p.name, value: p.value }))])
              )
            };
            const name = `Komponenten_${new Date().toISOString()}`;
            try {
              await axios.post(`${apiBase}/api/datasets`, { name, type: 'Komponenten', jsonPayload: JSON.stringify(payload) });
              alert('Komponenten als neues Dataset gespeichert');
              onSaveSuccess();
            } catch (e) {
              console.error('Save Komponenten dataset failed', e);
              alert('Speichern fehlgeschlagen');
            }
          }}
          style={{ padding: '6px 10px' }}
        >Als neues Dataset speichern</button>
      </div>
      <EditableGroupsPanel
        title="Ventilkonfiguration Sensor-Regler"
        groups={komponentenGroups}
        setGroups={(g) => { setKomponentenGroups(g); setKomponentenDirty(true); }}
        onDirty={(d) => setKomponentenDirty(d)}
      />
    </div>
  );
}

import React, { useState } from 'react';
import axios from 'axios';
import EditableGroupsPanel from '../EditableGroupsPanel';
import SaveDatasetModal from './SaveDatasetModal';
import { Dataset } from '../../types';

interface TestparameterPanelProps {
  apiBase: string;
  langzeitSets: Dataset[];
  detailSets: Dataset[];
  selectedLangzeitConfig: number | null;
  setSelectedLangzeitConfig: (id: number | null) => void;
  selectedDetailConfig: number | null;
  setSelectedDetailConfig: (id: number | null) => void;
  langzeitGroups: Record<string, { name: string; value: string }[]>;
  setLangzeitGroups: (g: Record<string, { name: string; value: string }[]>) => void;
  langzeitDirty: boolean;
  setLangzeitDirty: (d: boolean) => void;
  detailGroups: Record<string, { name: string; value: string }[]>;
  setDetailGroups: (g: Record<string, { name: string; value: string }[]>) => void;
  detailDirty: boolean;
  setDetailDirty: (d: boolean) => void;
  onSaveSuccess: () => void;
}

export default function TestparameterPanel({
  apiBase,
  langzeitSets,
  detailSets,
  selectedLangzeitConfig,
  setSelectedLangzeitConfig,
  selectedDetailConfig,
  setSelectedDetailConfig,
  langzeitGroups,
  setLangzeitGroups,
  langzeitDirty,
  setLangzeitDirty,
  detailGroups,
  setDetailGroups,
  detailDirty,
  setDetailDirty,
  onSaveSuccess
}: TestparameterPanelProps) {
  const [showLangzeitSaveModal, setShowLangzeitSaveModal] = useState<boolean>(false);
  const [showDetailSaveModal, setShowDetailSaveModal] = useState<boolean>(false);

  const getLangzeitPayload = () => {
    return JSON.stringify({
      groups: Object.fromEntries(
        Object.entries(langzeitGroups).map(([k, arr]) => [k, arr.map(p => ({ name: p.name, value: p.value }))])
      )
    });
  };

  const getDetailPayload = () => {
    return JSON.stringify({
      groups: Object.fromEntries(
        Object.entries(detailGroups).map(([k, arr]) => [k, arr.map(p => ({ name: p.name, value: p.value }))])
      )
    });
  };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontWeight: 'bold' }}>Langzeittest-Dataset:</label>
        <select
          value={selectedLangzeitConfig ?? ''}
          onChange={(e) => setSelectedLangzeitConfig(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4 }}
        >
          <option value="">— wählen —</option>
          {langzeitSets.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowLangzeitSaveModal(true)}
          style={{ padding: '6px 10px' }}
        >Als neues Dataset speichern</button>
      </div>
      <EditableGroupsPanel
        title="Konfiguration Langzeittest"
        groups={langzeitGroups}
        setGroups={(g) => { setLangzeitGroups(g); setLangzeitDirty(true); }}
        onDirty={(d) => setLangzeitDirty(d)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontWeight: 'bold' }}>Detailtest-Dataset:</label>
        <select
          value={selectedDetailConfig ?? ''}
          onChange={(e) => setSelectedDetailConfig(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: '6px 8px', border: '1px solid #ccc', borderRadius: 4 }}
        >
          <option value="">— wählen —</option>
          {detailSets.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowDetailSaveModal(true)}
          style={{ padding: '6px 10px' }}
        >Als neues Dataset speichern</button>
      </div>
      <EditableGroupsPanel
        title="Konfiguration Detailtest"
        groups={detailGroups}
        setGroups={(g) => { setDetailGroups(g); setDetailDirty(true); }}
        onDirty={(d) => setDetailDirty(d)}
      />

      <SaveDatasetModal
        isOpen={showLangzeitSaveModal}
        onClose={() => setShowLangzeitSaveModal(false)}
        onSaveSuccess={onSaveSuccess}
        apiBase={apiBase}
        type="Langzeittestparameter"
        jsonPayload={getLangzeitPayload()}
        existingNames={langzeitSets.map(s => s.name)}
      />

      <SaveDatasetModal
        isOpen={showDetailSaveModal}
        onClose={() => setShowDetailSaveModal(false)}
        onSaveSuccess={onSaveSuccess}
        apiBase={apiBase}
        type="Detailtestparameter"
        jsonPayload={getDetailPayload()}
        existingNames={detailSets.map(s => s.name)}
      />
    </div>
  );
}

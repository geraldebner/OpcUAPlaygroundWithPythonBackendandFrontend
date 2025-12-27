import React, { useState } from 'react';
import axios from 'axios';

interface SaveDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  apiBase: string;
  type: string;
  jsonPayload: string;
  existingNames?: string[];  // List of existing dataset names for validation
}

export default function SaveDatasetModal({
  isOpen,
  onClose,
  onSaveSuccess,
  apiBase,
  type,
  jsonPayload,
  existingNames = []
}: SaveDatasetModalProps) {
  const [name, setName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Bitte geben Sie einen Namen ein');
      return;
    }

    // Check for duplicate names
    if (existingNames.includes(name.trim())) {
      alert(`Ein Dataset mit dem Namen "${name.trim()}" existiert bereits. Bitte wählen Sie einen anderen Namen.`);
      return;
    }

    setIsSaving(true);
    try {
      const requestBody = {
        name: name.trim(),
        comment: comment.trim() || null, // Send null instead of undefined for better backend handling
        type,
        jsonPayload,
        blockIndex: 0  // Set to 0 for block-independent datasets
      };
      
      console.log('Sending request to save dataset:', requestBody);
      
      const response = await axios.post(`${apiBase}/api/datasets`, requestBody);
      console.log('Save response:', response.data);
      
      alert('Dataset erfolgreich gespeichert');
      setName('');
      setComment('');
      onClose();
      onSaveSuccess();
    } catch (error: any) {
      console.error('Save dataset failed', error.response?.data || error.message);
      alert(`Fehler beim Speichern: ${error.response?.data?.detail || error.response?.data?.error || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Dataset speichern</h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>
            Name: *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Ventilkonfig_v1"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '14px' }}>
            Kommentar:
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: Beschreibung oder Notizen"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
              minHeight: '80px',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: isSaving ? 0.6 : 1
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 16px',
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: isSaving ? 0.6 : 1
            }}
          >
            {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

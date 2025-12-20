import React, { useState } from 'react';
import './SaveDatasetModal.css';

interface SaveDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, comment: string, type: string) => void;
  blockIndex: number;
}

export default function SaveDatasetModal({ isOpen, onClose, onSave, blockIndex }: SaveDatasetModalProps) {
  const [name, setName] = useState(`Snapshot_${blockIndex}_${new Date().toISOString().split('T')[0]}`);
  const [comment, setComment] = useState('');
  const [type, setType] = useState('All');

  const typeOptions = [
    { value: 'All', label: 'All (all parameters)' },
    { value: 'VentilAnsteuerparameter', label: 'VentilAnsteuerparameter (Ventilkonfiguration/Ansteuerparameter)' },
    { value: 'VentilLangzeittestparameter', label: 'VentilLangzeittestparameter (Ventilkonfiguration/Langzeittest)' },
    { value: 'VentilDetailtestparameter', label: 'VentilDetailtestparameter (Ventilkonfiguration/Detailtest)' },
    { value: 'VentilEinzeltestparameter', label: 'VentilEinzeltestparameter (Ventilkonfiguration/Einzeltest)' }
  ];

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a name for the dataset');
      return;
    }
    onSave(name, comment, type);
    onClose();
    // Reset form
    setName(`Snapshot_${blockIndex}_${new Date().toISOString().split('T')[0]}`);
    setComment('');
    setType('All');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Save Parameter Dataset</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="dataset-name">Dataset Name *</label>
            <input
              id="dataset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter dataset name"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="dataset-type">Parameter Set Type *</label>
            <select
              id="dataset-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {typeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <small className="help-text">
              Select which parameters to include in this dataset
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="dataset-comment">Comment (optional)</label>
            <textarea
              id="dataset-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a description or notes..."
              rows={3}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save Dataset</button>
        </div>
      </div>
    </div>
  );
}

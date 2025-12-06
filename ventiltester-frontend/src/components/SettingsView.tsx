import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MappingSection from './MappingSection';
import BlockSelector from './shared/BlockSelector';

interface SettingsViewProps {
  apiBase: string;
  selectedBlock: number | null;
  onBlockChange: (block: number | null) => void;
}

interface MeasurementServiceSettings {
  enabled: boolean;
  pollingIntervalMs: number;
  monitoredGroups: string[];
}

export default function SettingsView({ apiBase, selectedBlock, onBlockChange }: SettingsViewProps) {
  const [settings, setSettings] = useState<MeasurementServiceSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pollingInterval, setPollingInterval] = useState<string>('1000');

  useEffect(() => {
    fetchSettings();
  }, [apiBase]);

  async function fetchSettings(): Promise<void> {
    try {
      setLoading(true);
      const res = await axios.get(`${apiBase}/api/settings/measurement-service`);
      setSettings(res.data);
      setPollingInterval(String(res.data.pollingIntervalMs));
    } catch (e) {
      console.error('Failed to fetch settings', e);
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function startService(): Promise<void> {
    try {
      setLoading(true);
      await axios.post(`${apiBase}/api/settings/measurement-service/start`);
      alert('Measurement service started');
      await fetchSettings();
    } catch (e: any) {
      console.error('Failed to start service', e);
      const msg = e?.response?.data?.error ?? e.message ?? String(e);
      alert('Failed to start service: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function stopService(): Promise<void> {
    try {
      setLoading(true);
      await axios.post(`${apiBase}/api/settings/measurement-service/stop`);
      alert('Measurement service stopped');
      await fetchSettings();
    } catch (e: any) {
      console.error('Failed to stop service', e);
      const msg = e?.response?.data?.error ?? e.message ?? String(e);
      alert('Failed to stop service: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function updatePollingInterval(): Promise<void> {
    const interval = parseInt(pollingInterval);
    if (isNaN(interval) || interval < 100) {
      alert('Polling interval must be at least 100ms');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${apiBase}/api/settings/measurement-service/polling-interval`, {
        intervalMs: interval
      });
      alert('Polling interval updated');
      await fetchSettings();
    } catch (e: any) {
      console.error('Failed to update polling interval', e);
      const msg = e?.response?.data?.error ?? e.message ?? String(e);
      alert('Failed to update polling interval: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !settings) {
    return <div style={{ padding: '20px' }}>Loading settings...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#1e3a5f' }}>Settings</h2>

      {/* Block Selection */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#1e3a5f', fontSize: '18px' }}>
          Block Selection
        </h3>
        <BlockSelector
          selectedBlock={selectedBlock}
          onBlockChange={onBlockChange}
        />
      </div>

      {/* Mapping Section */}
      <div style={{ marginBottom: '24px' }}>
        <MappingSection 
          apiBase={apiBase} 
          selectedBlock={selectedBlock}
          onMappingRefresh={fetchSettings}
        />
      </div>

      {/* Measurement Data Service Section */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#2c3e50' }}>
          Automatic Measurement Data Service
        </h3>
        
        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
          This service monitors OPC UA measurement groups for data changes. When the <code>DatenReady</code> value 
          increases, the entire group is automatically saved as a dataset with the DatenReady value as the identifier.
        </p>

        {settings && (
          <div>
            {/* Status */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#555' }}>Status:</div>
              <div style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: settings.enabled ? '#e8f5e9' : '#ffebee',
                color: settings.enabled ? '#2e7d32' : '#c62828'
              }}>
                {settings.enabled ? '● Running' : '○ Stopped'}
              </div>
              <button
                onClick={settings.enabled ? stopService : startService}
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  backgroundColor: settings.enabled ? '#f44336' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {settings.enabled ? 'Stop Service' : 'Start Service'}
              </button>
              <button
                onClick={fetchSettings}
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: loading ? 0.6 : 1
                }}
              >
                🔄 Refresh
              </button>
            </div>

            {/* Polling Interval */}
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: '#f5f7fa',
              borderRadius: '6px',
              border: '1px solid #e0e0e0'
            }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#555' }}>
                Polling Interval (milliseconds):
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="number"
                  value={pollingInterval}
                  onChange={e => setPollingInterval(e.target.value)}
                  min="100"
                  step="100"
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    width: '150px'
                  }}
                />
                <span style={{ fontSize: '13px', color: '#666' }}>
                  (Current: {settings.pollingIntervalMs}ms, minimum: 100ms)
                </span>
                <button
                  onClick={updatePollingInterval}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  Update Interval
                </button>
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                Lower values = more responsive but higher CPU usage. Recommended: 1000-5000ms
              </div>
            </div>

            {/* Monitored Groups */}
            <div style={{
              padding: '16px',
              backgroundColor: '#f5f7fa',
              borderRadius: '6px',
              border: '1px solid #e0e0e0'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '15px', color: '#555' }}>
                Monitored Groups (for all blocks 1-4):
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#666', lineHeight: '1.8' }}>
                {settings.monitoredGroups.map((group, idx) => (
                  <li key={idx}>
                    <code style={{ backgroundColor: '#e3f2fd', padding: '2px 6px', borderRadius: '3px' }}>
                      {group}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div style={{
        backgroundColor: '#e3f2fd',
        border: '1px solid #2196F3',
        borderRadius: '8px',
        padding: '16px',
        fontSize: '13px',
        color: '#1565c0',
        lineHeight: '1.6'
      }}>
        <strong>ℹ️ How it works:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>The service checks monitored groups every polling interval</li>
          <li>When <code>DatenReady</code> increases by 1 or more, the group data is saved</li>
          <li>The <code>DatenReady</code> value is used as the dataset identifier number</li>
          <li>Datasets are automatically named with timestamp and saved to the database</li>
          <li>All saved datasets can be viewed in the Historical Data tab</li>
        </ul>
      </div>
    </div>
  );
}

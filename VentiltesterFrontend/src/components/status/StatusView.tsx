import React, { useEffect, useState } from "react";
import "../../App.css";
import { useCache } from "../../hooks/useCache";
import StatusPanel from "./StatusPanel";
import VentilStatusOverview from "./VentilStatusOverview";

// Keep the same API_BASE resolution as App.tsx so this component works standalone
const API_BASE = (window as any).__API_BASE || (window as any).REACT_APP_API_BASE || "http://localhost:5000";

export default function StatusView() {
  const [status, setStatus] = useState<any>(null);
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [intervalSec, setIntervalSec] = useState<number>(5);
  const [selectedBlock, setSelectedBlock] = useState<number>(1);

  // Cached block data for detailed status components
  const { data, error, refresh } = useCache(API_BASE, selectedBlock, autoRefresh, Math.max(1, intervalSec) * 1000);

  useEffect(() => {
    fetchStatus();
    fetchCacheStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      fetchStatus();
      fetchCacheStatus();
    }, Math.max(1, intervalSec) * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, intervalSec]);

  // Trigger initial cache fetch and on block change when autoRefresh is off
  useEffect(() => {
    refresh();
  }, [selectedBlock]);

  async function fetchStatus() {
    try {
      setStatus(null);
      const res = await fetch(`${API_BASE}/api/status`);
      if (!res.ok) throw new Error(`Status request failed: ${res.status}`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
      setStatus({ error: String(e) });
    }
  }

  async function fetchCacheStatus() {
    try {
      setCacheStatus(null);
      const res = await fetch(`${API_BASE}/api/cache/status`);
      if (!res.ok) throw new Error(`Cache status request failed: ${res.status}`);
      const data = await res.json();
      setCacheStatus(data);
    } catch (e) {
      console.error(e);
      setCacheStatus({ error: String(e) });
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <h3>System Status</h3>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => { fetchStatus(); fetchCacheStatus(); refresh(); }}>Refresh Status</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto-refresh
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Interval (s): <input type="number" value={intervalSec} min={1} onChange={e => setIntervalSec(Number(e.target.value) || 5)} style={{ width: 64 }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Block: <input type="number" value={selectedBlock} min={1} onChange={e => setSelectedBlock(Math.max(1, Number(e.target.value) || 1))} style={{ width: 64 }} />
        </label>
      </div>
      {!status && <div>Loading status...</div>}
      {status && status.error && <div style={{ color: 'red' }}>Error: {status.error}</div>}
      {status && !status.error && (
        <div>
          <div><strong>Backend:</strong> {status.backend}</div>
          <div style={{ marginTop: 8 }}><strong>OPC UA:</strong>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>Connected: <span style={{ color: status.opcua?.connected ? 'green' : 'red', fontWeight: 700 }}>{String(status.opcua?.connected)}</span></div>
              <div>Endpoint: <code>{status.opcua?.endpoint}</code></div>
            </div>
            <div style={{ marginTop: 6 }}>Last successful check: {status.opcua?.lastSuccessfulCheck ? new Date(status.opcua.lastSuccessfulCheck).toLocaleString() : 'n/a'}</div>
            {status.opcua?.lastError && <div style={{ color: 'orangered', marginTop: 6 }}>Last error: {status.opcua.lastError}</div>}
          </div>
          <div style={{ marginTop: 8 }}><strong>Database:</strong>
            <div>Connected: {String(status.database?.connected)}</div>
          </div>
          <div style={{ marginTop: 8 }}><strong>Cache Service:</strong>
            {!cacheStatus && <div style={{ marginLeft: 12 }}>Loading cache status...</div>}
            {cacheStatus && cacheStatus.error && <div style={{ color: 'red', marginLeft: 12 }}>Error: {cacheStatus.error}</div>}
            {cacheStatus && !cacheStatus.error && (
              <div style={{ marginLeft: 12 }}>
                <div>Enabled: <span style={{ color: cacheStatus.isEnabled ? 'green' : 'red', fontWeight: 700 }}>{String(cacheStatus.isEnabled)}</span></div>
                <div>Update Interval: <code>{cacheStatus.updateIntervalMs}ms</code></div>
                <div>Cached Blocks: <code>{cacheStatus.cachedBlocks?.join(', ') || 'none'}</code></div>
              </div>
            )}
          </div>
          {status.globalData && (
            <div style={{ marginTop: 12, padding: 12, border: '1px solid #ddd', borderRadius: 4, backgroundColor: '#f9f9f9' }}>
              <strong>DB_GlobalData1:</strong>
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: '14px' }}>
                {Object.entries(status.globalData).map(([key, value]) => (
                  <React.Fragment key={key}>
                    <div style={{ fontWeight: 500 }}>{key}:</div>
                    <div><code>{String(value)}</code></div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Status for selected block */}
      <div style={{ marginTop: 16 }}>
        {error && (
          <div style={{ padding: 12, background: '#fee', border: '1px solid #fcc', borderRadius: 6, color: '#c33', marginBottom: 8 }}>
            {error}
          </div>
        )}
        <StatusPanel
          selectedBlock={selectedBlock}
          data={data}
          getMessModeText={(mode: number | null) => {
            if (mode === null) return 'Unbekannt';
            switch (mode) {
              case 0: return 'Keine Messung aktiv';
              case 1: return 'Langzeittest aktiv';
              case 2: return 'Detailtest aktiv';
              case 3: return 'Einzeltest aktiv';
              default: return `Unbekannt (${mode})`;
            }
          }}
          getOperationModeText={(mode: number | null) => {
            if (mode === null) return 'Unbekannt';
            switch (mode) {
              case 0: return 'Leerlauf (Bereit)';
              case 1: return 'Automatik Modus';
              case 2: return 'Manuell Modus';
              case 3: return 'Reset';
              default: return `Unbekannt (${mode})`;
            }
          }}
        />

        <VentilStatusOverview ventilData={data?.ventilData || []} />
      </div>
    </div>
  );
}

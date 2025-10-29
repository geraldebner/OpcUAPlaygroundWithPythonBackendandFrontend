import React, { useEffect, useState } from "react";
import "../App.css";

// Keep the same API_BASE resolution as App.tsx so this component works standalone
const API_BASE = window.__API_BASE || process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function StatusView() {
  const [status, setStatus] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [intervalSec, setIntervalSec] = useState(5);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchStatus(), Math.max(1, intervalSec) * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, intervalSec]);

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

  return (
    <div style={{ marginTop: 8 }}>
      <h3>System Status</h3>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => fetchStatus()}>Refresh Status</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto-refresh
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Interval (s): <input type="number" value={intervalSec} min={1} onChange={e => setIntervalSec(Number(e.target.value) || 5)} style={{ width: 64 }} />
        </label>
      </div>
      {!status && <div>Loading status...</div>}
      {status && status.error && <div style={{ color: 'red' }}>Error: {status.error}</div>}
      {status && !status.error && (
        <div>
          <div><strong>Backend:</strong> {status.backend}</div>
          <div style={{ marginTop: 8 }}><strong>OPC UA:</strong>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>Connected: <span style={{ color: status.opcua && status.opcua.connected ? 'green' : 'red', fontWeight: 700 }}>{String(status.opcua && status.opcua.connected)}</span></div>
              <div>Endpoint: <code>{status.opcua && status.opcua.endpoint}</code></div>
            </div>
            <div style={{ marginTop: 6 }}>Last successful check: {status.opcua && status.opcua.lastSuccessfulCheck ? new Date(status.opcua.lastSuccessfulCheck).toLocaleString() : 'n/a'}</div>
            {status.opcua && status.opcua.lastError && <div style={{ color: 'orangered', marginTop: 6 }}>Last error: {status.opcua.lastError}</div>}
          </div>
          <div style={{ marginTop: 8 }}><strong>Database:</strong>
            <div>Connected: {String(status.database && status.database.connected)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

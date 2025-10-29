import React, { useEffect, useState } from "react";
import "../App.css";

// Keep the same API_BASE resolution as App.tsx so this component works standalone
const API_BASE = window.__API_BASE || process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function StatusView() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

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
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => fetchStatus()}>Refresh Status</button>
      </div>
      {!status && <div>Loading status...</div>}
      {status && status.error && <div style={{ color: 'red' }}>Error: {status.error}</div>}
      {status && !status.error && (
        <div>
          <div><strong>Backend:</strong> {status.backend}</div>
          <div style={{ marginTop: 8 }}><strong>OPC UA:</strong>
            <div>Connected: {String(status.opcua && status.opcua.connected)}</div>
            <div>Endpoint: <code>{status.opcua && status.opcua.endpoint}</code></div>
          </div>
          <div style={{ marginTop: 8 }}><strong>Database:</strong>
            <div>Connected: {String(status.database && status.database.connected)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import "./App.css";
import StatusView from "./components/StatusView";
import ParametersView from "./components/ParametersView";
import CommandsMeasurementsView from "./components/CommandsMeasurementsView";

// API base URL: you can set `window.__API_BASE = 'https://...'` in the browser for overrides.
const API_BASE = (window as any).__API_BASE || (window as any).REACT_APP_API_BASE || "http://localhost:5000";

type Block = { index: number };

export default function App() {
  const [selectedTab, setSelectedTab] = useState<'parameters'|'commands'|'status'>('parameters');
  // Hardcoded 4 blocks instead of loading from API
  const [blocks] = useState<Block[]>([
    { index: 1 },
    { index: 2 },
    { index: 3 },
    { index: 4 }
  ]);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(1); // Default to block 1

  useEffect(() => {
    // Try to load blocks from API, but fallback to hardcoded if it fails
    loadBlockList();
  }, []);

  async function loadBlockList() {
    try {
      // DEV-TRACE: log when App.tsx requests parameter list (optional check)
      console.debug('[API CALL] App.tsx -> GET /api/parameters (checking if backend is available)');
      const res = await fetch(`${API_BASE}/api/parameters`);
      if (!res.ok) throw new Error(`Load blocks failed: ${res.status}`);
      const data = await res.json();
      console.log('Backend available - found blocks:', data?.length || 0);
      // Backend is available, but we still use hardcoded blocks for consistency
    } catch (e) {
      console.log('Backend not available, using hardcoded blocks 1-4');
    }
  }  return (
    <div style={{ padding: 16 }}>
      <h2>VentilTester</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Block: </label>
        <select value={selectedBlock ?? ""} onChange={e => setSelectedBlock(Number(e.target.value))}>
          <option value="">-- select --</option>
          {blocks.map(b => <option key={b.index} value={b.index}>{b.index}</option>)}
        </select>
        <button onClick={loadBlockList} style={{ marginLeft: 8 }}>Check Backend</button>
        <span style={{ marginLeft: 16 }}>
          <button onClick={() => setSelectedTab('parameters')} disabled={selectedTab==='parameters'}>Parameters</button>
          <button onClick={() => setSelectedTab('commands')} disabled={selectedTab==='commands'} style={{ marginLeft: 8 }}>Commands</button>
          <button onClick={() => setSelectedTab('status')} disabled={selectedTab==='status'} style={{ marginLeft: 8 }}>Status</button>
        </span>
      </div>

      {!selectedBlock && <div>No block selected. Please select a block above.</div>}

      {selectedTab === 'parameters' && selectedBlock && (
        <ParametersView apiBase={API_BASE} selectedBlock={selectedBlock} />
      )}

      {selectedTab === 'commands' && selectedBlock && (
        <CommandsMeasurementsView apiBase={API_BASE} selectedBlock={selectedBlock} />
      )}

      {selectedTab === 'status' && (
        <StatusView />
      )}
    </div>
  );
}

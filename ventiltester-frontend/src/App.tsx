import React, { useEffect, useState } from "react";
import "./App.css";
import Navigation from "./components/Navigation";
import StatusView from "./components/StatusView";
import ParametersView from "./components/ParametersView";
import CommandsMeasurementsView from "./components/CommandsMeasurementsView";
import HistoricalDataSetsView from "./components/HistoricalDataSetsView";

// API base URL: you can set `window.__API_BASE = 'https://...'` in the browser for overrides.
const API_BASE = (window as any).__API_BASE || (window as any).REACT_APP_API_BASE || "http://localhost:5000";

type Block = { index: number };

export default function App() {
  const [selectedTab, setSelectedTab] = useState<'parameters'|'commands'|'status'|'historical'>('parameters');
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      <Navigation
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        selectedBlock={selectedBlock}
        blocks={blocks}
        onBlockChange={setSelectedBlock}
        onCheckBackend={loadBlockList}
      />

      <div style={{ padding: '24px' }}>
        {!selectedBlock && (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>
              No Block Selected
            </h3>
            <p style={{ margin: 0, color: '#7f8c8d' }}>
              Please select a test block from the navigation above to begin.
            </p>
          </div>
        )}

        {selectedTab === 'parameters' && selectedBlock && (
          <ParametersView apiBase={API_BASE} selectedBlock={selectedBlock} />
        )}

        {selectedTab === 'commands' && selectedBlock && (
          <CommandsMeasurementsView apiBase={API_BASE} selectedBlock={selectedBlock} />
        )}

        {selectedTab === 'historical' && selectedBlock && (
          <HistoricalDataSetsView apiBase={API_BASE} selectedBlock={selectedBlock} />
        )}

        {selectedTab === 'status' && (
          <StatusView />
        )}
      </div>
    </div>
  );
}

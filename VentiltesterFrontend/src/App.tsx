import React, { useEffect, useState } from "react";
import './App.css';
import Navigation from './components/Navigation';
import StatusView from './components/status/StatusView';
import ParametersView from './components/parameters/ParametersView';
import CommandsMeasurementsView from './components/CommandsMeasurementsView';
import HistoricalDataSetsView from './components/HistoricalDataSetsView';
import SettingsView from './components/settings/SettingsView';
import TestRunView from './components/TestRunView';
import { useStatusStore } from './hooks/useStatusStore';

// API base URL: you can set `window.__API_BASE = 'https://...'` in the browser for overrides.
const API_BASE = (window as any).__API_BASE || (window as any).REACT_APP_API_BASE || "http://localhost:5000";

type Block = { index: number };

export default function App() {
  const [selectedTab, setSelectedTab] = useState<'parameters'|'commandsandmeasurements'|'status'|'historical'|'settings'|'testrun'>('parameters');
  // Hardcoded 4 blocks instead of loading from API
  const [blocks] = useState<Block[]>([
    { index: 1 },
    { index: 2 },
    { index: 3 },
    { index: 4 }
  ]);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(1); // Default to block 1

  const {
    messMode,
    operationMode,
    batteryStatus,
    setBlock: setStatusBlock,
  } = useStatusStore(API_BASE, selectedBlock ?? 1, true);

  useEffect(() => {
    // Check backend availability on startup
    checkBackend();
  }, []);

  // Keep status store in sync with currently selected block
  useEffect(() => {
    if (selectedBlock != null) {
      setStatusBlock(selectedBlock);
    }
  }, [selectedBlock, setStatusBlock]);

  async function checkBackend() {
    try {
      const res = await fetch(`${API_BASE}/api/parameters`);
      if (res.ok) {
        console.log('Backend connected successfully');
      }
    } catch (e) {
      console.warn('Backend not reachable');
    }
    }
    return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      <Navigation
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        selectedBlock={selectedBlock}
        blocks={blocks}
        onBlockChange={setSelectedBlock}
        messMode={messMode}
        operationMode={operationMode}
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

        {selectedTab === 'commandsandmeasurements' && selectedBlock && (
          <CommandsMeasurementsView apiBase={API_BASE} selectedBlock={selectedBlock} />
        )}

        {selectedTab === 'historical' && selectedBlock && (
          <HistoricalDataSetsView apiBase={API_BASE} selectedBlock={selectedBlock} />
        )}

        {selectedTab === 'testrun' && selectedBlock && (
          <TestRunView apiBase={API_BASE} selectedBlock={selectedBlock} />
        )}

        {selectedTab === 'status' && (
          <StatusView />
        )}

        {selectedTab === 'settings' && (
          <SettingsView apiBase={API_BASE} selectedBlock={selectedBlock} onBlockChange={setSelectedBlock} />
        )}
      </div>
    </div>
  );
}

function formatMessMode(mode: number | null) {
  if (mode === null) return 'Unbekannt';
  switch (mode) {
    case 0: return 'Keine Messung aktiv';
    case 1: return 'Langzeittest aktiv';
    case 2: return 'Detailtest aktiv';
    case 3: return 'Einzeltest aktiv';
    default: return `Unbekannt (${mode})`;
  }
}

function formatOperationMode(mode: number | null) {
  if (mode === null) return 'Unbekannt';
  switch (mode) {
    case 0: return 'Leerlauf (Bereit)';
    case 1: return 'Automatik Modus';
    case 2: return 'Manuell Modus';
    case 3: return 'Reset';
    default: return `Unbekannt (${mode})`;
  }
}

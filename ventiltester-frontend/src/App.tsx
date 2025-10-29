import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./App.css";
import StatusView from "./components/StatusView";

// API base URL: you can set `window.__API_BASE = 'https://...'` in the browser for overrides.
const API_BASE = (window as any).__API_BASE || (window as any).REACT_APP_API_BASE || "http://localhost:5000";

type Parameter = { name: string; value: string };
type Group = { [groupKey: string]: Parameter[] };
type Block = { index: number; groups?: Group; AllgemeineParameter?: any; /* other typed groups may exist */ };

export default function App() {
  const [selectedTab, setSelectedTab] = useState<'parameters'|'commands'|'status'>('parameters');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [currentBlock, setCurrentBlock] = useState<Block | null>(null);
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [loadingParam, setLoadingParam] = useState<Record<string, Record<string, boolean>>>({});
  const [cmdLoading, setCmdLoading] = useState<Record<string, boolean>>({});
  const [einzelVentil, setEinzelVentil] = useState<string>("");
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    loadBlockList();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    // nothing specific for status here - StatusView handles its own loading
  }, [selectedTab]);

  useEffect(() => {
    if (selectedBlock != null) fetchBlock(selectedBlock);
  }, [selectedBlock]);

  async function loadBlockList() {
    try {
      const res = await fetch(`${API_BASE}/api/parameters`);
      if (!res.ok) throw new Error(`Load blocks failed: ${res.status}`);
      const data = await res.json();
      setBlocks(data || []);
      // auto-select first block if none
      if ((data || []).length && selectedBlock == null) setSelectedBlock(data[0].index ?? 1);
    } catch (e) {
      console.error(e);
    }
  }

  async function executeCommand(testType: string, action: string, payload?: string) {
    if (selectedBlock == null) return;
    const key = `${testType}::${action}`;
    setCmdLoading(prev => ({ ...(prev||{}), [key]: true }));
    try {
      const url = `${API_BASE}/api/commands/${selectedBlock}/${encodeURIComponent(testType)}/${encodeURIComponent(action)}`;
      const body = payload ? JSON.stringify({ value: payload }) : undefined;
      const res = await fetch(url, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body
      });
      if (!res.ok) throw new Error(`Command failed ${res.status}`);
      // optionally show success - here we just log and clear state
      console.log('command ok', testType, action);
    } catch (e) {
      console.error(e);
      alert(`Command ${testType}/${action} failed: ${e}`);
    } finally {
      setCmdLoading(prev => ({ ...(prev||{}), [key]: false }));
    }
  }

  async function fetchBlock(index: number) {
    try {
      const res = await fetch(`${API_BASE}/api/parameters/${index}`);
      if (!res.ok) throw new Error(`Fetch block failed: ${res.status}`);
      const block = await res.json();
      setCurrentBlock(block);
      initEditsFromBlock(block);
    } catch (e) {
      console.error(e);
      setCurrentBlock(null);
    }
  }

  

  function initEditsFromBlock(block: Block) {
    const newEdits: Record<string, Record<string, string>> = {};
    if (block.groups) {
      for (const g of Object.keys(block.groups)) {
        newEdits[g] = {};
        for (const p of block.groups[g] || []) {
          newEdits[g][p.name] = p.value ?? "";
        }
      }
    }
    setEdits(newEdits);
  }

  function getParamKey(group: string, name: string) {
    return `${group}:::${name}`;
  }

  async function readSingleParam(group: string, name: string) {
    if (selectedBlock == null) return;
    setLoadingParam(prev => ({ ...prev, [group]: { ...(prev[group] || {}), [name]: true } }));
    try {
      const url = `${API_BASE}/api/parameters/${selectedBlock}/value?group=${encodeURIComponent(group)}&name=${encodeURIComponent(name)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Read failed ${res.status}`);
      const data = await res.json(); // { name, value, dataType? }
      // update live value in currentBlock
      setCurrentBlock(cb => {
        if (!cb) return cb;
        const copy = { ...cb, groups: { ...(cb.groups || {}) } as Group };
        const groupArr = (copy.groups || {})[group] || [];
        const idx = groupArr.findIndex((p: any) => p.name === name);
        if (idx >= 0) {
          groupArr[idx] = { ...groupArr[idx], value: data.value };
        } else {
          groupArr.push({ name, value: data.value });
        }
        copy.groups![group] = groupArr;
        return copy;
      });
      setEdits(prev => ({ ...(prev || {}), [group]: { ...(prev[group] || {}), [name]: data.value ?? "" } }));
    } catch (e) {
      console.error(e);
      // optionally show error to user
    } finally {
      setLoadingParam(prev => ({ ...prev, [group]: { ...(prev[group] || {}), [name]: false } }));
    }
  }

  async function writeSingleParam(group: string, name: string) {
    if (selectedBlock == null) return;
    const value = edits?.[group]?.[name];
    setLoadingParam(prev => ({ ...prev, [group]: { ...(prev[group] || {}), [name]: true } }));
    try {
      const url = `${API_BASE}/api/parameters/${selectedBlock}/value?group=${encodeURIComponent(group)}&name=${encodeURIComponent(name)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error(`Write failed ${res.status}`);
      // refresh single param after write
      await readSingleParam(group, name);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingParam(prev => ({ ...prev, [group]: { ...(prev[group] || {}), [name]: false } }));
    }
  }

  function renderParameterRow(group: string, p: Parameter) {
    const live = p.value ?? "";
    const editVal = edits?.[group]?.[p.name] ?? "";
    const isLoading = !!(loadingParam[group] && loadingParam[group][p.name]);

    return (
      <div key={getParamKey(group, p.name)} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
        <div style={{ minWidth: 240, fontWeight: 500 }}>{p.name}</div>
        <div style={{ minWidth: 120 }}>Live: <code>{String(live)}</code></div>
        <input
          style={{ minWidth: 220 }}
          value={editVal}
          onChange={e => setEdits(prev => ({ ...(prev || {}), [group]: { ...(prev[group] || {}), [p.name]: e.target.value } }))}
        />
        <button onClick={() => readSingleParam(group, p.name)} disabled={isLoading} title="Read single parameter">Read</button>
        <button onClick={() => writeSingleParam(group, p.name)} disabled={isLoading} title="Write single parameter">Write</button>
        {isLoading && <span style={{ marginLeft: 8 }}>⏳</span>}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>VentilTester</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Block: </label>
        <select value={selectedBlock ?? ""} onChange={e => setSelectedBlock(Number(e.target.value))}>
          <option value="">-- select --</option>
          {blocks.map(b => <option key={b.index} value={b.index}>{b.index}</option>)}
        </select>
        <button onClick={() => selectedBlock != null && fetchBlock(selectedBlock)} style={{ marginLeft: 8 }}>Refresh</button>
        <span style={{ marginLeft: 16 }}>
          <button onClick={() => setSelectedTab('parameters')} disabled={selectedTab==='parameters'}>Parameters</button>
          <button onClick={() => setSelectedTab('commands')} disabled={selectedTab==='commands'} style={{ marginLeft: 8 }}>Commands</button>
          <button onClick={() => setSelectedTab('status')} disabled={selectedTab==='status'} style={{ marginLeft: 8 }}>Status</button>
        </span>
      </div>

      {!currentBlock && <div>No block selected or block not loaded.</div>}

      {selectedTab === 'parameters' && currentBlock && currentBlock.groups && Object.keys(currentBlock.groups).map(groupKey => (
        <div key={groupKey} style={{ marginBottom: 16, borderTop: "1px solid #ddd", paddingTop: 8 }}>
          <h4>{groupKey}</h4>
          {(currentBlock.groups![groupKey] || []).map((p: Parameter) => renderParameterRow(groupKey, p))}
        </div>
      ))}

      {selectedTab === 'commands' && (
        <div style={{ marginTop: 8 }}>
          <h3>Commands</h3>
          <div style={{ marginBottom: 12 }}>
            <h4>Langzeittest</h4>
            <button onClick={() => executeCommand('Langzeittest', 'Start')} disabled={!!cmdLoading['Langzeittest::Start']}>Start</button>
            <button onClick={() => executeCommand('Langzeittest', 'Stop')} disabled={!!cmdLoading['Langzeittest::Stop']} style={{ marginLeft: 8 }}>Stop</button>
            <button onClick={() => executeCommand('Langzeittest', 'Pause')} disabled={!!cmdLoading['Langzeittest::Pause']} style={{ marginLeft: 8 }}>Pause</button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <h4>Detailtest</h4>
            <button onClick={() => executeCommand('Detailtest', 'Start')} disabled={!!cmdLoading['Detailtest::Start']}>Start</button>
            <button onClick={() => executeCommand('Detailtest', 'Stop')} disabled={!!cmdLoading['Detailtest::Stop']} style={{ marginLeft: 8 }}>Stop</button>
            <button onClick={() => executeCommand('Detailtest', 'Pause')} disabled={!!cmdLoading['Detailtest::Pause']} style={{ marginLeft: 8 }}>Pause</button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <h4>Einzeltest</h4>
            <label>Ventilnummer: </label>
            <input value={einzelVentil} onChange={e => setEinzelVentil(e.target.value)} style={{ marginLeft: 8, marginRight: 8 }} />
            <button onClick={() => executeCommand('Einzeltest', 'Start', einzelVentil)} disabled={!!cmdLoading['Einzeltest::Start']}>Start</button>
            <button onClick={() => executeCommand('Einzeltest', 'Stop', einzelVentil)} disabled={!!cmdLoading['Einzeltest::Stop']} style={{ marginLeft: 8 }}>Stop</button>
            <button onClick={() => executeCommand('Einzeltest', 'Pause', einzelVentil)} disabled={!!cmdLoading['Einzeltest::Pause']} style={{ marginLeft: 8 }}>Pause</button>
          </div>
        </div>
      )}

      {selectedTab === 'status' && (
        <StatusView />
      )}

      <div style={{ marginTop: 20 }}>
        <h5>Debug</h5>
        <pre style={{ maxHeight: 240, overflow: "auto" }}>{JSON.stringify({ selectedTab, selectedBlock, currentBlock, edits }, null, 2)}</pre>
      </div>
    </div>
  );
}

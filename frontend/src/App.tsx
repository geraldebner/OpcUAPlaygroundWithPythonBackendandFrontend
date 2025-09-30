// TreeView component for recursive rendering
interface TreeViewProps {
  data: any;
}

export function TreeView({ data }: TreeViewProps) {
  if (Array.isArray(data)) {
    return (
      <ul>
        {data.map((item: any, idx: number) => (
          <li key={idx}><TreeView data={item} /></li>
        ))}
      </ul>
    );
  } else if (typeof data === "object" && data !== null) {
    if ("value" in data && "node_id" in data) {
      return (
        <span><b>{data.name || data.node_id}</b>: {String(data.value)}</span>
      );
    }
    return (
      <ul>
        {Object.entries(data).map(([key, val]) => (
          <li key={key}><b>{key}</b>: <TreeView data={val} /></li>
        ))}
      </ul>
    );
  } else {
    return <span>{String(data)}</span>;
  }
}
import React, { useEffect, useState } from "react";
import './App.css';

function App() {
  const [opcuaTree, setOpcuaTree] = useState(null);
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [historical, setHistorical] = useState([]);
  const [values, setValues] = useState([]);
  const [paramValues, setParamValues] = useState([]);
  const [editValues, setEditValues] = useState({});
  const [message, setMessage] = useState("");
  const [loadingOpcuaTree, setLoadingOpcuaTree] = useState(false);
  const [opcuaTreeError, setOpcuaTreeError] = useState(null);

  // Load OPC UA tree for new tab
  useEffect(() => {
    if (tab === 4) {
      setLoadingOpcuaTree(true);
      fetch("http://localhost:8000/opcua_tree")
        .then(res => {
          if (!res.ok) {
            throw new Error("Netzwerkantwort war nicht ok");
          }
          return res.json();
        })
        .then(setOpcuaTree)
        .catch((error) => {
          console.error("Fehler beim Laden des OPC UA Baums:", error);
          setOpcuaTreeError("Fehler beim Laden des Baums");
        })
        .finally(() => setLoadingOpcuaTree(false));
    }
  }, [tab]);

  const loadStatus = () => {
    fetch("http://localhost:8000/status")
      .then(res => res.json())
      .then(setStatus);
  };

  useEffect(() => {
    if (tab === 3) {
      loadStatus();
      const interval = setInterval(loadStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [tab]);

  const loadValues = () => {
    fetch("http://localhost:8000/sim_values")
      .then(res => res.json())
      .then(setValues);
  }

  return (
    <div className="container">
      <h1>OPC UA Playground</h1>
      <div className="tabs">
        <button className={tab === 0 ? "active" : ""} onClick={() => setTab(0)}>Simulation Werte</button>
        <button className={tab === 1 ? "active" : ""} onClick={() => setTab(1)}>Parameter setzen</button>
        <button className={tab === 2 ? "active" : ""} onClick={() => setTab(2)}>Historische Daten</button>
        <button className={tab === 3 ? "active" : ""} onClick={() => setTab(3)}>Status</button>
        <button className={tab === 4 ? "active" : ""} onClick={() => setTab(4)}>OPC UA Baum</button>
      </div>
      <div className="tab-content">
        {tab === 4 && (
          <div>
            <h2>OPC UA Datenbaum</h2>
            {loadingOpcuaTree && <div>Lade Baum...</div>}
            {opcuaTreeError && <div style={{color: 'red'}}>{opcuaTreeError}</div>}
            {opcuaTree && !loadingOpcuaTree && !opcuaTreeError && <TreeView data={opcuaTree} />}
          </div>
        )}
        {tab === 0 && (<div><h2>Simulation Werte</h2><div>Simulation Werte Inhalt</div></div>)}
        {tab === 1 && (<div><h2>Parameter setzen</h2><div>Parameter setzen Inhalt</div></div>)}
        {tab === 2 && (<div><h2>Historische Daten</h2><div>Historische Daten Inhalt</div></div>)}
        {tab === 3 && (<div><h2>Status</h2><div>Status Inhalt</div></div>)}
      </div>
    </div>
  );
}

export default App;

import React, { useEffect, useState } from "react";
import './App.css';

function App() {
  const [tab, setTab] = useState(0);
  const [status, setStatus] = useState(null);
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
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [historical, setHistorical] = useState([]);
  const [values, setValues] = useState([]);
  const [paramValues, setParamValues] = useState([]);
  const [editValues, setEditValues] = useState({});
  const [message, setMessage] = useState("");

  const loadValues = () => {
    fetch("http://localhost:8000/sim_values")
      .then(res => res.json())
      .then(setValues);
    fetch("http://localhost:8000/param_values")
      .then(res => res.json())
      .then(data => {
        setParamValues(data);
        const editObj = {};
        data.forEach((v) => { editObj[v.node_id] = v.value; });
        setEditValues(editObj);
      });
  };

  // Load devices for historical tab
  useEffect(() => {
    fetch("http://localhost:8000/data")
      .then(res => res.json())
      .then(data => {
        // If using new schema, get device names from /historical_values endpoint or add a /devices endpoint
        // For now, extract unique device names from paramValues
        const devs = Array.from(new Set(paramValues.map(v => `Device${v.device}`)));
        setDevices(devs);
      });
  }, [paramValues]);

  const loadHistorical = () => {
    if (!selectedDevice) return;
    let url = `http://localhost:8000/historical_values?device_name=${selectedDevice}`;
    if (startTime) url += `&start=${startTime}`;
    if (endTime) url += `&end=${endTime}`;
    fetch(url)
      .then(res => res.json())
      .then(setHistorical);
  };

  useEffect(() => {
    if (tab === 2) {
      loadHistorical();
    }
    // eslint-disable-next-line
  }, [tab, selectedDevice, startTime, endTime]);

  useEffect(() => {
    loadValues();
    const interval = setInterval(loadValues, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleEdit = (node_id, value) => {
    setEditValues({ ...editValues, [node_id]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let ok = true;
    for (const node_id of Object.keys(editValues)) {
      const deviceMatch = node_id.match(/Device(\d+)/);
      const indexMatch = node_id.match(/ParamValue(\d+)/);
      if (!deviceMatch || !indexMatch) continue;
      const device = parseInt(deviceMatch[1]);
      const index = parseInt(indexMatch[1]);
      const res = await fetch("http://localhost:8000/param_values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device,
          index,
          value: parseFloat(editValues[node_id])
        })
      });
      if (!res.ok) ok = false;
    }
    setMessage(ok ? "Parameterwerte aktualisiert!" : "Fehler beim Schreiben!");
    loadValues();
  };

  return (
    <div className="container">
      <h1>OPC UA Playground</h1>
      <div className="tabs">
        <button className={tab === 0 ? "active" : ""} onClick={() => setTab(0)}>Simulation Werte</button>
        <button className={tab === 1 ? "active" : ""} onClick={() => setTab(1)}>Parameter setzen</button>
        <button className={tab === 2 ? "active" : ""} onClick={() => setTab(2)}>Historische Daten</button>
        <button className={tab === 3 ? "active" : ""} onClick={() => setTab(3)}>Status</button>
      </div>
  <div className="tab-content">
        {tab === 3 && (
          <div>
            <h2>Status</h2>
            {status ? (
              <table className="modern-table">
                <tbody>
                  <tr>
                    <td>OPC UA Server verbunden</td>
                    <td>{status.opcua_connected ? "Ja" : "Nein"}</td>
                  </tr>
                  <tr>
                    <td>Datenbank Status</td>
                    <td>{status.db_status ? "OK" : "Fehler"}</td>
                  </tr>
                  <tr>
                    <td>Backend Uptime (Sekunden)</td>
                    <td>{status.uptime_seconds}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div>Lade Status...</div>
            )}
          </div>
        )}
        {tab === 2 && (
          <div>
            <h2>Historische Daten</h2>
            <div style={{ marginBottom: 16 }}>
              <label>Gerät:&nbsp;
                <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
                  <option value="">Bitte wählen</option>
                  {devices.map(dev => (
                    <option key={dev} value={dev}>{dev}</option>
                  ))}
                </select>
              </label>
              &nbsp;&nbsp;
              <label>Start:&nbsp;
                <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </label>
              &nbsp;&nbsp;
              <label>Ende:&nbsp;
                <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </label>
              &nbsp;&nbsp;
              <button className="submit-btn" onClick={loadHistorical} type="button">Filtern</button>
            </div>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Typ</th>
                  <th>Index</th>
                  <th>Node ID</th>
                  <th>Wert</th>
                  <th>Zeitstempel</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(historical) ? historical : []).map((row, i) => (
                  <tr key={i}>
                    <td>{row.type}</td>
                    <td>{row.index}</td>
                    <td>{row.node_id}</td>
                    <td>{row.value}</td>
                    <td>{row.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 0 && (
          <div>
            <h2>Simulation Werte</h2>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Index</th>
                  <th>Node ID</th>
                  <th>Wert</th>
                </tr>
              </thead>
              <tbody>
                {values.map((row) => (
                  <tr key={row.node_id}>
                    <td>{row.device}</td>
                    <td>{row.index}</td>
                    <td>{row.node_id}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 1 && (
          <div>
            <h2>Parameter setzen</h2>
            <form onSubmit={handleSubmit}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Index</th>
                    <th>Node ID</th>
                    <th>Aktueller Wert</th>
                    <th>Neuer Wert</th>
                  </tr>
                </thead>
                <tbody>
                  {paramValues.map((row) => (
                    <tr key={row.node_id}>
                      <td>{row.device}</td>
                      <td>{row.index}</td>
                      <td>{row.node_id}</td>
                      <td>{row.value}</td>
                      <td>
                        <input
                          type="number"
                          value={editValues[row.node_id]}
                          onChange={e => handleEdit(row.node_id, e.target.value)}
                          style={{ width: "80px" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="submit" className="submit-btn">Parameter senden</button>
            </form>
            <div className="message">{message}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

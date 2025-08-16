import React, { useEffect, useState } from "react";

function App() {
  const [values, setValues] = useState([]);
  const [paramValues, setParamValues] = useState([]);
  const [editValues, setEditValues] = useState({});
  const [message, setMessage] = useState("");

  // Alle Werte laden
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

  useEffect(() => {
    loadValues();
    const interval = setInterval(loadValues, 2000);
    return () => clearInterval(interval);
  }, []);

  // Parameterwert ändern
  const handleEdit = (node_id, value) => {
    setEditValues({ ...editValues, [node_id]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let ok = true;
    for (const node_id of Object.keys(editValues)) {
      const res = await fetch("http://localhost:8000/param_values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id, value: parseFloat(editValues[node_id]) })
      });
      if (!res.ok) ok = false;
    }
    setMessage(ok ? "Parameterwerte aktualisiert!" : "Fehler beim Schreiben!");
    loadValues();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>OPC UA Simulationswerte</h1>
      <table border="1">
        <thead>
          <tr>
            <th>Node ID</th>
            <th>Wert</th>
          </tr>
        </thead>
        <tbody>
          {values.map((row, i) => (
            <tr key={row.node_id}>
              <td>{row.node_id}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Parameterwerte ändern</h2>
      <form onSubmit={handleSubmit}>
        {paramValues.map((row) => (
          <div key={row.node_id}>
            <label>{row.node_id}: </label>
            <input
              type="number"
              value={editValues[row.node_id]}
              onChange={e => handleEdit(row.node_id, e.target.value)}
            />
          </div>
        ))}
        <button type="submit">Parameter senden</button>
      </form>
      <div>{message}</div>
    </div>
  );
}

export default App;

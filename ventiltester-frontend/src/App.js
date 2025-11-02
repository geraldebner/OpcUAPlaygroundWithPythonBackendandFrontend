import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import ParametersView from './components/ParametersView';
import CommandsMeasurementsView from './components/CommandsMeasurementsView';
import StatusView from './components/StatusView';

function App() {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(1);
  const [topTab, setTopTab] = useState('parameters');
  const [serverStatus, setServerStatus] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

  useEffect(() => {
    // fetch block list for selector
    async function fetchBlocks() {
      try {
  // DEV-TRACE: log when App.js requests parameter list
  console.debug('[API CALL] App.js -> GET /api/parameters');
  const res = await axios.get(`${API_BASE}/api/parameters`);
  const data = res.data || [];
        setBlocks(data.map(d => ({ index: d.index })));
        if (data.length > 0 && !selectedBlock) setSelectedBlock(data[0].index);
      } catch (e) {
        console.error('fetchBlocks', e);
      }
    }
    fetchBlocks();
  }, []);

  useEffect(() => {
    // poll status endpoint to surface mapping/opcua errors to the UI
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/status`);
        if (mounted) setServerStatus(res.data);
      } catch (e) {
        if (mounted) setServerStatus({ opcua: { connected: false, lastError: 'Failed to reach backend' } });
      }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 10000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return (
    <div className="app-root">
      {serverStatus && serverStatus.opcua && (!serverStatus.opcua.connected || serverStatus.opcua.lastError) && (
        <div style={{background:'#ffe6e6', color:'#700', padding: '8px 12px', textAlign:'center'}}>
          {serverStatus.opcua.lastError ? `OPC UA error: ${serverStatus.opcua.lastError}` : 'OPC UA not connected'}
        </div>
      )}
      <header>
        <div className="header-left">
          {/* Place the provided logo file `binder_logo.png` into the frontend `public/` folder */}
          <img src="/binder_logo.svg" alt="binder+co" className="header-logo" />
          <h2>VentilTester</h2>
        </div>
      </header>
      <section className="controls">
        <div className="tabs">
          <button className={topTab==='parameters'? 'active':''} onClick={() => setTopTab('parameters')}>Parameters</button>
          <button className={topTab==='commands'? 'active':''} onClick={() => setTopTab('commands')} style={{marginLeft:8}}>Commands & Measurements</button>
          <button className={topTab==='status'? 'active':''} onClick={() => setTopTab('status')} style={{marginLeft:8}}>Status</button>
        </div>

        <div>
          <label>Block: </label>
          <select value={selectedBlock} onChange={e => setSelectedBlock(Number(e.target.value))}>
            {[1,2,3,4].map(i => <option key={i} value={i}>Block {i}</option>)}
          </select>
        </div>
      </section>

      <main className="main-grid">
        <div className="block-pane">
          {topTab === 'parameters' && (
            <ParametersView apiBase={API_BASE} selectedBlock={selectedBlock} />
          )}
          {topTab === 'commands' && (
            <CommandsMeasurementsView apiBase={API_BASE} selectedBlock={selectedBlock} />
          )}
          {topTab === 'status' && (
            <StatusView />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

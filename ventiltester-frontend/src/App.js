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

  return (
    <div className="app-root">
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
            {blocks.map(b => <option key={b.index} value={b.index}>Block {b.index}</option>)}
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

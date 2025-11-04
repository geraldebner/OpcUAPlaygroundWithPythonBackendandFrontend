import React from 'react';

export default function ParameterLiveDataPanel({
  selectedBlock,
  blocks,
  autoRefresh,
  setAutoRefresh,
  isRefreshing,
  refreshBlock,
  saveDataset,
  writeBlockToOpc,
  readGroup,
  writeGroup,
  readParam,
  writeParam,
  edits,
  getEditKey,
  busyGroups,
  formatValue,
  setEdits
}) {
  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
      <h3 style={{ marginTop: 0 }}>Live Parameters</h3>
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}><input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto-refresh</label>
        <button onClick={() => refreshBlock(selectedBlock)} disabled={isRefreshing}>Refresh</button>
        <button onClick={() => saveDataset(selectedBlock)} style={{ marginLeft: 8 }}>Save dataset</button>
        <button onClick={() => writeBlockToOpc(selectedBlock)} style={{ marginLeft: 8 }}>Write block to OPC UA</button>
      </div>

      <div style={{ paddingTop: 12 }}>
        {blocks.filter(b => b.index === selectedBlock).map(b => (
          <div key={b.index} className="block-card">
            <h4 style={{ marginTop: 0 }}>Block {b.index} — Parameters</h4>
            {b.groups && Object.keys(b.groups).length > 0 &&
              Object.keys(b.groups)
                .filter(g => {
                  // Only apply exclusion filter to the top-level group name (before any '/').
                  // This prevents excluding subgroup entries like "Konfiguration_Detailtest/Strom"
                  const top = ((g || '').split('/')[0] || '').toLowerCase();
                  return !(top.includes('daten') || top.includes('kommand'));
                })
                .sort((a, bname) => {
                  const order = ['AllgemeineParameter', 'Ventilkonfiguration', 'Konfiguration_Langzeittest', 'Konfiguration_Detailtest'];
                  const atop = (a || '').split('/')[0];
                  const btop = (bname || '').split('/')[0];
                  const ai = order.indexOf(atop);
                  const bi = order.indexOf(btop);
                  if (ai === -1 && bi === -1) return a.localeCompare(bname);
                  if (ai === -1) return 1;
                  if (bi === -1) return -1;
                  return ai - bi;
                })
                .map(g => {
                  const gKey = `${b.index}||${g}`;
                  const isBusy = !!busyGroups[gKey];
                  // split group into top-level and optional subgroup for nicer display
                  const parts = (g || '').split('/');
                  const top = parts[0];
                  const subgroup = parts.length > 1 ? parts.slice(1).join('/') : null;
                  return (
                    <div key={g} className="group-card" style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h5 style={{ margin: 0 }}>{top}</h5>
                          {subgroup && <div style={{ fontSize: 12, color: '#666' }}>{subgroup}</div>}
                        </div>
                        <div>
                          <button onClick={() => readGroup(b.index, g)} disabled={isBusy}>Read</button>
                          <button onClick={() => writeGroup(b.index, g)} disabled={isBusy} style={{ marginLeft: 8 }}>Write</button>
                          {isBusy && <span style={{ marginLeft: 8 }}>…</span>}
                        </div>
                      </div>
                      <table className="param-table">
                        <tbody>
                          {b.groups[g].map((p, i) => {
                            const key = getEditKey(b.index, g, p.name);
                            const live = p.value;
                            return (
                              <tr key={p.name}>
                                <td className="param-name">{p.name}</td>
                                <td style={{ fontSize: 12, color: '#333' }}>Live: <code>{formatValue(live)}</code></td>
                                <td>
                                  <input value={edits[key] ?? live} onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))} />
                                </td>
                                <td style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => readParam(b.index, g, p.name)} disabled={isBusy}>Read</button>
                                  <button onClick={() => writeParam(b.index, g, p.name)} disabled={isBusy}>Write</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';

interface VentilStatusOverviewProps {
  ventilData: any[];
}

export default function VentilStatusOverview({ ventilData }: VentilStatusOverviewProps) {
  if (!ventilData || ventilData.length === 0) {
    return null;
  }

  const thStyle: React.CSSProperties = {
    padding: '12px 8px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '12px',
    borderBottom: '2px solid #2c3e50'
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 8px',
    textAlign: 'center',
    borderBottom: '1px solid #e9ecef'
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>Ventil Status Overview</h2>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
              <th style={thStyle} rowSpan={2}>Ventil</th>
              <th style={thStyle} rowSpan={2}>Zähler</th>
              <th style={thStyle} colSpan={3}>Strommessung</th>
              <th style={thStyle} colSpan={3}>Durchflussmessung</th>
              <th style={thStyle} colSpan={3}>Kraftmessung</th>
            </tr>
            <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Ready</th>
              <th style={thStyle}>MessID</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Ready</th>
              <th style={thStyle}>MessID</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Ready</th>
              <th style={thStyle}>MessID</th>
            </tr>
          </thead>
          <tbody>
            {ventilData.map((ventil: any, idx: number) => (
              <tr key={ventil.ventilNr} style={{
                backgroundColor: idx % 2 === 0 ? '#f8f9fa' : 'white'
              }}>
                <td style={tdStyle}><strong>Ventil {ventil.ventilNr}</strong></td>
                <td style={tdStyle}><strong>{ventil.zaehler}</strong></td>
                <td style={tdStyle}>{ventil.strom.status}</td>
                <td style={tdStyle}>{ventil.strom.datenReady}</td>
                <td style={tdStyle}>{ventil.strom.messID}</td>
                <td style={tdStyle}>{ventil.durchfluss.status}</td>
                <td style={tdStyle}>{ventil.durchfluss.datenReady}</td>
                <td style={tdStyle}>{ventil.durchfluss.messID}</td>
                <td style={tdStyle}>{ventil.kraft.status}</td>
                <td style={tdStyle}>{ventil.kraft.datenReady}</td>
                <td style={tdStyle}>{ventil.kraft.messID}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
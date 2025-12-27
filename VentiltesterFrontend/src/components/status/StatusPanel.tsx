import React from 'react';
import { useStatusStore } from '../../hooks/useStatusStore';
import { TestOverviewData } from '../../hooks/useCache';

interface StatusPanelProps {
  apiBase: string;
  selectedBlock: number;
  data?: TestOverviewData | null;
  getMessModeText?: (mode: number | null) => string;
  getOperationModeText?: (mode: number | null) => string;
}

export default function StatusPanel({ apiBase, selectedBlock, data: externalData, getMessModeText, getOperationModeText }: StatusPanelProps) {
  // If the parent supplies data, render directly without fetching to avoid duplicate requests.
  if (externalData !== undefined) {
    return (
      <StatusPanelContent
        data={externalData}
        selectedBlock={selectedBlock}
        getMessModeText={getMessModeText}
        getOperationModeText={getOperationModeText}
      />
    );
  }

  // Fallback: fetch on demand when no external data is provided.
  const { data } = useStatusStore(apiBase, selectedBlock, false);
  return (
    <StatusPanelContent
      data={data}
      selectedBlock={selectedBlock}
      getMessModeText={getMessModeText}
      getOperationModeText={getOperationModeText}
    />
  );
}

function StatusPanelContent({ data, selectedBlock, getMessModeText: messTextFn, getOperationModeText: opTextFn }: {
  data: TestOverviewData | null | undefined;
  selectedBlock: number;
  getMessModeText?: (mode: number | null) => string;
  getOperationModeText?: (mode: number | null) => string;
}) {
  if (!data?.globalData && !data?.allgemeineParameter) {
    return null;
  }

  const getMessModeText = messTextFn ?? ((mode: number | null) => {
    if (mode === null) return 'Unbekannt';
    switch (mode) {
      case 0: return 'Keine Messung aktiv';
      case 1: return 'Langzeittest aktiv';
      case 2: return 'Detailtest aktiv';
      case 3: return 'Einzeltest aktiv';
      default: return `Unbekannt (${mode})`;
    }
  });
  
  const getOperationModeText = opTextFn ?? ((mode: number | null) => {
    if (mode === null) return 'Unbekannt';
    switch (mode) {
      case 0: return 'Leerlauf (Bereit)';
      case 1: return 'Automatik Modus';
      case 2: return 'Manuell Modus';
      case 3: return 'Reset';
      default: return `Unbekannt (${mode})`;
    }
  });

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ margin: '0 0 8px 0', color: '#2c3e50', fontSize: '14px', fontWeight: 'bold' }}>
        Status - Block {selectedBlock}
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Global Data */}
        {data?.globalData && (
          <div style={{
            padding: '8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px'
          }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Global Data</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '8px'
            }}>
              <DataCard label="Battery Status" value={data.globalData.batteryStatus * 100} unit="%" />
              <BitfieldCard label="General Errors" value={data.globalData.generalErrors} />
              <DataCard label="Temperature PLC" value={data.globalData.temperaturePLC} unit="°C" />
              <IntegerCard label="Version" value={data.globalData.version} />
            </div>
          </div>
        )}
        
        {/* Allgemeine Parameter */}
        {data?.allgemeineParameter && (
          <div style={{
            padding: '8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px'
          }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>Allgemeine Parameter</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '8px'
            }}>
              <BitfieldCard label="Fehlerbit" value={data.allgemeineParameter.fehlerbit} />
              <DataCard label="Air Pressure" value={data.allgemeineParameter.currentAirPressure} unit="mbar" />
              <DataCard label="Air Flow" value={data.allgemeineParameter.currentAirFlow} unit="l/min" />
              <DataCard label="Force" value={data.allgemeineParameter.currentForce} unit="N" />
              <div style={{
                padding: '8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Mess Mode</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#212529' }}>
                  {getMessModeText(data.allgemeineParameter.messMode)} ({data.allgemeineParameter.messMode})
                </div>
              </div>
              <div style={{
                padding: '8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Operation Mode</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#212529' }}>
                  {getOperationModeText(data.allgemeineParameter.operationMode)} ({data.allgemeineParameter.operationMode})
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function DataCard({ label, value, unit }: { label: string; value: number | null | undefined; unit?: string }) {
  const displayValue = value != null && typeof value === 'number' ? value.toFixed(2) : '--';
  
  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#2c3e50'
      }}>
        {displayValue} {unit && <span style={{ fontSize: '12px', color: '#7f8c8d' }}>{unit}</span>}
      </div>
    </div>
  );
}

function BitfieldCard({ label, value }: { label: string; value: number | null | undefined }) {
  const bitValue = value != null && typeof value === 'number' ? Math.round(value) : 0;
  const binaryString = bitValue.toString(2).padStart(8, '0');
  
  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#2c3e50',
        fontFamily: 'monospace'
      }}>
        {binaryString} <span style={{ fontSize: '12px', color: '#7f8c8d' }}>(0x{bitValue.toString(16).toUpperCase()})</span>
      </div>
    </div>
  );
}

function IntegerCard({ label, value }: { label: string; value: number | null | undefined }) {
  const displayValue = value != null && typeof value === 'number' ? Math.round(value).toString() : '--';
  
  return (
    <div style={{
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#2c3e50'
      }}>
        {displayValue}
      </div>
    </div>
  );
}
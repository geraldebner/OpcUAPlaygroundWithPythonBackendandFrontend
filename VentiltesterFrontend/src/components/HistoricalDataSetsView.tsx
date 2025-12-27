import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { HistoricalDataSetsViewProps } from '../types';
import { Snapshot, LoadedData } from './HistoricalDataSets/types';
import DatasetList from './HistoricalDataSets/DatasetList';
import LoadedDataDisplay from './HistoricalDataSets/LoadedDataDisplay';
import CurveChart from './HistoricalDataSets/CurveChart';
import { useChartInteractions } from './HistoricalDataSets/useChartInteractions';
import { formatValue, getMesskurveData, exportToJSON, exportToCSV } from './HistoricalDataSets/utils';

export default function HistoricalDataSetsView({ apiBase, selectedBlock }: HistoricalDataSetsViewProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [commentFilter, setCommentFilter] = useState<string>('');
  const [identifierFilter, setIdentifierFilter] = useState<string>('');
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalJson, setModalJson] = useState<string>('');
  const [modalTitle, setModalTitle] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use chart interactions hook
  const {
    zoomState,
    measurementState,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoom,
    toggleMeasurement,
    clearMeasurementLines
  } = useChartInteractions(canvasRef, loadedData);

  // Load snapshots when component mounts or selectedBlock changes
  useEffect(() => {
    if (selectedBlock !== null) {
      loadSnapshots();
    }
  }, [selectedBlock, apiBase]);

  async function loadSnapshots(): Promise<void> {
    if (selectedBlock === null) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/api/measurementsets`, { 
        params: { blockIndex: selectedBlock } 
      });
      setSnapshots(res.data || []);
    } catch (e) {
      console.error('Failed to load snapshots', e);
      alert('Failed to load historical datasets');
    } finally {
      setLoading(false);
    }
  }

  async function loadDataset(id: number): Promise<void> {
    try {
      const res = await axios.get(`${apiBase}/api/measurementsets/${id}`);
      const dataset = res.data;
      
      // Detailed debugging
      console.log('=== DATASET RESPONSE DEBUG ===');
      console.log('Full response:', JSON.stringify(dataset, null, 2));
      console.log('Response keys:', Object.keys(dataset));
      console.log('TestRunMessID:', dataset.testRunMessID, dataset.TestRunMessID);
      console.log('testRun:', dataset.testRun);
      console.log('TestRun:', dataset.TestRun);
      console.log('Is TestRun null?', dataset.TestRun === null);
      console.log('Is TestRun undefined?', dataset.TestRun === undefined);
      console.log('==============================');
      
      if (!dataset) {
        alert('Dataset not found');
        return;
      }

      let parsedData = {};
      try {
        parsedData = JSON.parse(dataset.payload);
      } catch (e) {
        console.warn('Failed to parse dataset payload:', e);
        parsedData = dataset.payload;
      }

      // Handle both TestRun (PascalCase from backend) and testRun (camelCase)
      const testRunData = dataset.TestRun || dataset.testRun;
      console.log('Using testRunData:', testRunData);

      const loadedDataset: LoadedData = {
        id: dataset.id,
        name: dataset.name,
        comment: dataset.comment,
        messID: dataset.messID,
        createdAt: dataset.createdAt,
        data: parsedData,
        testRun: testRunData ? {
          messID: testRunData.MessID || testRunData.messID,
          testType: testRunData.TestType || testRunData.testType,
          status: testRunData.Status || testRunData.status,
          startedAt: testRunData.StartedAt || testRunData.startedAt,
          completedAt: testRunData.CompletedAt || testRunData.completedAt,
          comment: testRunData.Comment || testRunData.comment,
          ventilConfigs: (testRunData.VentilConfigs || testRunData.ventilConfigs || []).map((vc: any) => ({
            ventilNumber: vc.VentilNumber || vc.ventilNumber,
            enabled: vc.Enabled !== undefined ? vc.Enabled : vc.enabled,
            comment: vc.Comment || vc.comment
          }))
        } : undefined
      };

      console.log('Final loadedDataset.testRun:', loadedDataset.testRun);
      setLoadedData(loadedDataset);
    } catch (e) {
      console.error('Failed to load dataset', e);
      alert('Failed to load dataset');
    }
  }

  async function deleteDataset(id: number): Promise<void> {
    if (!confirm('Delete this historical dataset? This action cannot be undone.')) return;
    
    try {
      await axios.delete(`${apiBase}/api/measurementsets/${id}`);
      setSnapshots(prev => prev.filter(s => s.id !== id));
      
      if (loadedData?.id === id) {
        setLoadedData(null);
      }
      
      alert('Dataset deleted successfully');
    } catch (e) {
      console.error('Failed to delete dataset', e);
      alert('Failed to delete dataset');
    }
  }

  function previewDataset(id: number, name?: string): void {
    const snapshot = snapshots.find(s => s.id === id);
    if (!snapshot) return;

    loadDataset(id).then(() => {
      if (loadedData) {
        const pretty = JSON.stringify(loadedData.data, null, 2);
        setModalTitle(name || `Dataset ${id}`);
        setModalJson(pretty);
        setShowModal(true);
      }
    });
  }

  // Filter snapshots based on comment and identifier
  const filteredSnapshots = snapshots.filter(snapshot => {
    const commentMatch = !commentFilter.trim() || 
      (snapshot.comment && snapshot.comment.toLowerCase().includes(commentFilter.toLowerCase()));
    
    const identifierMatch = !identifierFilter.trim() || 
      (snapshot.messID && snapshot.messID.toString().includes(identifierFilter));
    
    return commentMatch && identifierMatch;
  });

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3>Historical Data Sets - Block {selectedBlock}</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
          <input
            placeholder="Filter by comment..."
            value={commentFilter}
            onChange={e => setCommentFilter(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', width: '200px' }}
          />
          <input
            placeholder="Filter by identifier..."
            value={identifierFilter}
            onChange={e => setIdentifierFilter(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', width: '150px' }}
          />
          <button onClick={loadSnapshots} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <span style={{ color: '#666', fontSize: '14px' }}>
            Showing {filteredSnapshots.length} of {snapshots.length} datasets
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Left side: Dataset list */}
        <div style={{ flex: '0 0 300px' }}>
          <DatasetList
            snapshots={filteredSnapshots}
            loadedData={loadedData}
            loading={loading}
            onLoadDataset={loadDataset}
            onPreviewDataset={previewDataset}
            onDeleteDataset={deleteDataset}
          />
        </div>

        {/* Right side: Data Sets label, Plot, and Values */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4>Loaded Dataset</h4>
      
          {/* pMesskurve Chart */}
          {loadedData && (
            <CurveChart
              loadedData={loadedData}
              canvasRef={canvasRef}
              zoomState={zoomState}
              measurementState={measurementState}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onResetZoom={resetZoom}
              onToggleMeasurement={toggleMeasurement}
              onClearMeasurementLines={clearMeasurementLines}
              getMesskurveData={() => getMesskurveData(loadedData)}
            />
          )}

          {/* Dataset values below the chart */}
          <LoadedDataDisplay
            loadedData={loadedData}
            onExportJSON={() => exportToJSON(loadedData)}
            onExportCSV={() => exportToCSV(loadedData)}
            formatValue={formatValue}
          />
        </div>
      </div>

      {/* Preview Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            padding: 16,
            width: '80%',
            height: '80%',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: '1px solid #eee'
            }}>
              <h4 style={{ margin: 0 }}>{modalTitle}</h4>
              <button 
                onClick={() => setShowModal(false)}
                style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
              {modalJson}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

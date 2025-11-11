import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HistoricalDataSetsViewProps } from '../types';

interface Snapshot {
  id: number;
  name: string;
  createdAt: string;
  comment?: string;
  identifierNumber?: number;
}

interface LoadedData {
  id: number;
  name: string;
  comment?: string;
  identifierNumber?: number;
  createdAt: string;
  data: any;
}

export default function HistoricalDataSetsView({ apiBase, selectedBlock }: HistoricalDataSetsViewProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [commentFilter, setCommentFilter] = useState<string>('');
  const [identifierFilter, setIdentifierFilter] = useState<string>('');
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalJson, setModalJson] = useState<string>('');
  const [modalTitle, setModalTitle] = useState<string>('');
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  // Chart zoom and pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Measurement lines state
  const [measurementEnabled, setMeasurementEnabled] = useState<boolean>(false);
  const [measurementLine1, setMeasurementLine1] = useState<number | null>(null); // Data index
  const [measurementLine2, setMeasurementLine2] = useState<number | null>(null); // Data index
  const [draggingLine, setDraggingLine] = useState<number | null>(null); // 1 or 2

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

      const loadedDataset: LoadedData = {
        id: dataset.id,
        name: dataset.name,
        comment: dataset.comment,
        identifierNumber: dataset.identifierNumber,
        createdAt: dataset.createdAt,
        data: parsedData
      };

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
      
      // Clear loaded data if it's the one being deleted
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

  function formatValue(v: any): string {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'string') {
      try {
        const p = JSON.parse(v);
        if (Array.isArray(p)) return p.join(', ');
        if (typeof p === 'object') return JSON.stringify(p);
      } catch { }
      return v;
    }
    return String(v);
  }

  function exportToJSON(): void {
    if (!loadedData) {
      alert('No data loaded to export');
      return;
    }

    const dataStr = JSON.stringify(loadedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${loadedData.name || 'dataset'}_${loadedData.id}_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportToCSV(): void {
    if (!loadedData) {
      alert('No data loaded to export');
      return;
    }

    const rows: string[] = [];
    
    // Add header row with metadata
    rows.push('Dataset Information');
    rows.push(`Name,${loadedData.name}`);
    rows.push(`ID,${loadedData.id}`);
    rows.push(`Created At,${new Date(loadedData.createdAt).toLocaleString()}`);
    if (loadedData.identifierNumber) {
      rows.push(`Identifier Number,${loadedData.identifierNumber}`);
    }
    if (loadedData.comment) {
      rows.push(`Comment,"${loadedData.comment.replace(/"/g, '""')}"`);
    }
    rows.push(''); // Empty line separator

    // Add parameter data
    if (loadedData.data?.groups) {
      rows.push('Group,Parameter Name,Value');
      
      Object.keys(loadedData.data.groups).forEach(groupName => {
        const params = loadedData.data.groups[groupName];
        params.forEach((param: any) => {
          const value = formatValue(param.value);
          // Escape commas and quotes in CSV
          const escapedValue = value.includes(',') || value.includes('"') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
          rows.push(`${groupName},${param.name},${escapedValue}`);
        });
      });
    } else {
      rows.push('Data');
      rows.push(JSON.stringify(loadedData.data));
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${loadedData.name || 'dataset'}_${loadedData.id}_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Extract pMesskurve data if it exists
  function getMesskurveData(): number[] | null {
    if (!loadedData?.data?.groups) return null;
    
    for (const groupName in loadedData.data.groups) {
      const params = loadedData.data.groups[groupName];
      const messkurveParam = params.find((p: any) => 
        p.name === 'pMesskurven' || p.name === 'pMesskurve'
      );
      
      if (messkurveParam?.value) {
        try {
          const parsed = typeof messkurveParam.value === 'string' 
            ? JSON.parse(messkurveParam.value) 
            : messkurveParam.value;
          
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.warn('Failed to parse pMesskurve data:', e);
        }
      }
    }
    return null;
  }

  // Draw chart on canvas with zoom and pan
  useEffect(() => {
    const messkurveData = getMesskurveData();
    if (!messkurveData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 40, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Find min/max values
    const values = messkurveData.filter((v: number) => v !== 0); // Filter out zeros for better scaling
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;

    // Calculate visible range based on zoom and pan
    const dataLength = messkurveData.length;
    const visibleRange = dataLength / zoomLevel;
    const centerIndex = dataLength / 2 - (panOffset.x * dataLength / (chartWidth * zoomLevel));
    const startIndex = Math.max(0, Math.floor(centerIndex - visibleRange / 2));
    const endIndex = Math.min(dataLength - 1, Math.ceil(centerIndex + visibleRange / 2));

    // Calculate visible Y range based on pan
    const yPanFactor = panOffset.y / (chartHeight * zoomLevel);
    const visibleMinValue = minValue + (valueRange * yPanFactor);
    const visibleMaxValue = visibleMinValue + (valueRange / zoomLevel);

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Draw grid lines and Y-axis labels
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (chartHeight * i / ySteps);
      const value = visibleMaxValue - ((visibleMaxValue - visibleMinValue) * i / ySteps);
      
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      ctx.fillText(value.toFixed(0), padding.left - 10, y + 4);
    }

    // Draw X-axis labels
    ctx.textAlign = 'center';
    const xSteps = 10;
    for (let i = 0; i <= xSteps; i++) {
      const x = padding.left + (chartWidth * i / xSteps);
      const index = Math.floor(startIndex + ((endIndex - startIndex) * i / xSteps));
      ctx.fillText(index.toString(), x, height - padding.bottom + 20);
    }

    // Draw axis labels
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sample Index', width / 2, height - 5);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Pressure Value', 0, 0);
    ctx.restore();

    // Clip to chart area
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
    ctx.clip();

    // Draw line chart
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let firstPoint = true;
    for (let i = startIndex; i <= endIndex; i++) {
      const value = messkurveData[i];
      const normalizedX = (i - startIndex) / (endIndex - startIndex);
      const x = padding.left + (chartWidth * normalizedX);
      const normalizedY = (value - visibleMinValue) / (visibleMaxValue - visibleMinValue);
      const y = height - padding.bottom - (chartHeight * normalizedY);
      
      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#2196F3';
    const visibleDataPoints = endIndex - startIndex;
    const pointInterval = Math.max(1, Math.floor(visibleDataPoints / 200)); // Show max 200 points
    
    for (let i = startIndex; i <= endIndex; i += pointInterval) {
      const value = messkurveData[i];
      const normalizedX = (i - startIndex) / (endIndex - startIndex);
      const x = padding.left + (chartWidth * normalizedX);
      const normalizedY = (value - visibleMinValue) / (visibleMaxValue - visibleMinValue);
      const y = height - padding.bottom - (chartHeight * normalizedY);
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Draw measurement lines (outside clipping region)
    if (measurementEnabled && (measurementLine1 !== null || measurementLine2 !== null)) {
      ctx.save();
      
      // Helper function to draw a measurement line
      const drawMeasurementLine = (dataIndex: number, color: string, label: string) => {
        if (dataIndex < startIndex || dataIndex > endIndex) return null;
        
        const value = messkurveData[dataIndex];
        const normalizedX = (dataIndex - startIndex) / (endIndex - startIndex);
        const x = padding.left + (chartWidth * normalizedX);
        
        // Draw vertical line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw label box at top
        ctx.fillStyle = color;
        ctx.font = 'bold 11px sans-serif';
        const text = `${label}: ${value.toFixed(1)} @ ${dataIndex}`;
        const textMetrics = ctx.measureText(text);
        const boxWidth = textMetrics.width + 12;
        const boxHeight = 20;
        const boxX = Math.max(padding.left, Math.min(x - boxWidth / 2, width - padding.right - boxWidth));
        
        ctx.fillRect(boxX, padding.top - 25, boxWidth, boxHeight);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(text, boxX + boxWidth / 2, padding.top - 10);
        
        return { dataIndex, value, x };
      };
      
      const line1Info = measurementLine1 !== null ? drawMeasurementLine(measurementLine1, '#FF5722', 'L1') : null;
      const line2Info = measurementLine2 !== null ? drawMeasurementLine(measurementLine2, '#4CAF50', 'L2') : null;
      
      // Draw measurement difference if both lines are present
      if (line1Info && line2Info) {
        const indexDiff = Math.abs(line2Info.dataIndex - line1Info.dataIndex);
        const valueDiff = (line2Info.value - line1Info.value).toFixed(1);
        const midX = (line1Info.x + line2Info.x) / 2;
        
        // Draw connecting line
        ctx.strokeStyle = '#9C27B0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(line1Info.x, height - padding.bottom + 10);
        ctx.lineTo(line2Info.x, height - padding.bottom + 10);
        ctx.stroke();
        
        // Draw difference label
        ctx.fillStyle = '#9C27B0';
        ctx.font = 'bold 12px sans-serif';
        const diffText = `Δ: ${valueDiff} (${indexDiff} samples)`;
        const diffMetrics = ctx.measureText(diffText);
        const diffBoxWidth = diffMetrics.width + 12;
        const diffBoxHeight = 22;
        
        ctx.fillRect(midX - diffBoxWidth / 2, height - padding.bottom + 15, diffBoxWidth, diffBoxHeight);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(diffText, midX, height - padding.bottom + 30);
      }
      
      ctx.restore();
    }

  }, [loadedData, zoomLevel, panOffset, measurementEnabled, measurementLine1, measurementLine2]);

  // Get canvas-relative coordinates
  function getCanvasCoords(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  // Get data index from canvas X coordinate
  function getDataIndexFromX(canvasX: number): number | null {
    const messkurveData = getMesskurveData();
    if (!messkurveData) return null;

    const padding = { left: 60, right: 40 };
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const chartWidth = canvas.width - padding.left - padding.right;
    
    // Calculate visible range
    const dataLength = messkurveData.length;
    const visibleRange = dataLength / zoomLevel;
    const centerIndex = dataLength / 2 - (panOffset.x * dataLength / (chartWidth * zoomLevel));
    const startIndex = Math.max(0, Math.floor(centerIndex - visibleRange / 2));
    const endIndex = Math.min(dataLength - 1, Math.ceil(centerIndex + visibleRange / 2));
    
    // Convert canvas X to data index
    const relativeX = canvasX - padding.left;
    const normalizedX = relativeX / chartWidth;
    const dataIndex = Math.round(startIndex + normalizedX * (endIndex - startIndex));
    
    return Math.max(0, Math.min(dataLength - 1, dataIndex));
  }

  // Check if mouse is near a measurement line
  function getNearbyMeasurementLine(canvasX: number): number | null {
    if (!measurementEnabled || !canvasRef.current) return null;
    
    const padding = { left: 60, right: 40 };
    const chartWidth = canvasRef.current.width - padding.left - padding.right;
    const messkurveData = getMesskurveData();
    if (!messkurveData) return null;
    
    const dataLength = messkurveData.length;
    const visibleRange = dataLength / zoomLevel;
    const centerIndex = dataLength / 2 - (panOffset.x * dataLength / (chartWidth * zoomLevel));
    const startIndex = Math.max(0, Math.floor(centerIndex - visibleRange / 2));
    const endIndex = Math.min(dataLength - 1, Math.ceil(centerIndex + visibleRange / 2));
    
    const threshold = 10; // pixels
    
    if (measurementLine1 !== null && measurementLine1 >= startIndex && measurementLine1 <= endIndex) {
      const normalizedX = (measurementLine1 - startIndex) / (endIndex - startIndex);
      const lineX = padding.left + (chartWidth * normalizedX);
      if (Math.abs(canvasX - lineX) < threshold) return 1;
    }
    
    if (measurementLine2 !== null && measurementLine2 >= startIndex && measurementLine2 <= endIndex) {
      const normalizedX = (measurementLine2 - startIndex) / (endIndex - startIndex);
      const lineX = padding.left + (chartWidth * normalizedX);
      if (Math.abs(canvasX - lineX) < threshold) return 2;
    }
    
    return null;
  }

  // Handle mouse wheel for zooming
  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>): void {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prev => Math.max(1, Math.min(20, prev * zoomFactor)));
  }

  // Handle mouse down for panning or measurement line dragging
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>): void {
    const coords = getCanvasCoords(e);
    
    if (measurementEnabled) {
      const nearbyLine = getNearbyMeasurementLine(coords.x);
      if (nearbyLine !== null) {
        setDraggingLine(nearbyLine);
        return;
      }
      
      // Place new measurement line on click
      const dataIndex = getDataIndexFromX(coords.x);
      if (dataIndex !== null) {
        if (measurementLine1 === null) {
          setMeasurementLine1(dataIndex);
        } else if (measurementLine2 === null) {
          setMeasurementLine2(dataIndex);
        }
      }
      return;
    }
    
    // Normal panning
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y
    });
  }

  // Handle mouse move for panning or measurement line dragging
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (draggingLine !== null) {
      const coords = getCanvasCoords(e);
      const dataIndex = getDataIndexFromX(coords.x);
      if (dataIndex !== null) {
        if (draggingLine === 1) {
          setMeasurementLine1(dataIndex);
        } else if (draggingLine === 2) {
          setMeasurementLine2(dataIndex);
        }
      }
      return;
    }
    
    if (!isDragging) return;
    
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }

  // Handle mouse up
  function handleMouseUp(): void {
    setIsDragging(false);
    setDraggingLine(null);
  }

  // Reset zoom and pan
  function resetZoom(): void {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }

  // Toggle measurement mode
  function toggleMeasurement(): void {
    setMeasurementEnabled(!measurementEnabled);
    if (measurementEnabled) {
      // Clear measurement lines when disabling
      setMeasurementLine1(null);
      setMeasurementLine2(null);
    }
  }

  // Clear measurement lines
  function clearMeasurementLines(): void {
    setMeasurementLine1(null);
    setMeasurementLine2(null);
  }

  // Reset zoom when loading new data
  useEffect(() => {
    resetZoom();
  }, [loadedData]);

  // Filter snapshots based on comment and identifier
  const filteredSnapshots = snapshots.filter(snapshot => {
    const commentMatch = !commentFilter.trim() || 
      (snapshot.comment && snapshot.comment.toLowerCase().includes(commentFilter.toLowerCase()));
    
    const identifierMatch = !identifierFilter.trim() || 
      (snapshot.identifierNumber && snapshot.identifierNumber.toString().includes(identifierFilter));
    
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
        {/* Dataset List */}
        <div style={{ flex: '1', minWidth: '400px' }}>
          <h4>Available Datasets</h4>
          {filteredSnapshots.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666', border: '1px dashed #ccc' }}>
              {snapshots.length === 0 ? 'No historical datasets found' : 'No datasets match the current filters'}
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd' }}>
              {filteredSnapshots.map(snapshot => (
                <div 
                  key={snapshot.id} 
                  style={{ 
                    padding: '12px', 
                    borderBottom: '1px solid #eee',
                    backgroundColor: loadedData?.id === snapshot.id ? '#f0f8ff' : 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <strong>{snapshot.name}</strong>
                        {snapshot.identifierNumber && (
                          <span style={{
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            #{snapshot.identifierNumber}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(snapshot.createdAt).toLocaleString()}
                      </div>
                      {snapshot.comment && (
                        <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
                          {snapshot.comment}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button 
                        onClick={() => loadDataset(snapshot.id)}
                        style={{ 
                          fontSize: '12px', 
                          padding: '4px 8px',
                          backgroundColor: loadedData?.id === snapshot.id ? '#007bff' : '#f8f9fa',
                          color: loadedData?.id === snapshot.id ? 'white' : 'black',
                          border: '1px solid #ccc',
                          borderRadius: '4px'
                        }}
                      >
                        Load
                      </button>
                      <button 
                        onClick={() => previewDataset(snapshot.id, snapshot.name)}
                        style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        Preview
                      </button>
                      <button 
                        onClick={() => deleteDataset(snapshot.id)}
                        style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loaded Data Display */}
        <div style={{ flex: '1', minWidth: '400px' }}>
          <h4>Loaded Dataset</h4>
          {loadedData ? (
            <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '12px' }}>
              <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '16px' }}>{loadedData.name}</strong>
                    {loadedData.identifierNumber && (
                      <span style={{
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        #{loadedData.identifierNumber}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={exportToJSON}
                      style={{ 
                        padding: '6px 12px', 
                        backgroundColor: '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Export to JSON"
                    >
                      📥 JSON
                    </button>
                    <button 
                      onClick={exportToCSV}
                      style={{ 
                        padding: '6px 12px', 
                        backgroundColor: '#17a2b8', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Export to CSV"
                    >
                      📥 CSV
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Created: {new Date(loadedData.createdAt).toLocaleString()}
                </div>
                {loadedData.comment && (
                  <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
                    "{loadedData.comment}"
                  </div>
                )}
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {loadedData.data?.groups ? (
                  Object.keys(loadedData.data.groups).map(groupName => (
                    <div key={groupName} style={{ marginBottom: '16px' }}>
                      <h5 style={{ margin: '0 0 8px 0', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                        {groupName}
                      </h5>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #ddd' }}>Parameter</th>
                            <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #ddd' }}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadedData.data.groups[groupName].map((param: any, idx: number) => (
                            <tr key={idx}>
                              <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                                {param.name}
                              </td>
                              <td style={{ padding: '6px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                                {formatValue(param.value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                ) : (
                  <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(loadedData.data, null, 2)}
                  </pre>
                )}
              </div>

              {/* pMesskurve Chart */}
              {getMesskurveData() && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #ddd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h5 style={{ margin: 0, color: '#333' }}>
                      Pressure Measurement Curve (pMesskurve)
                    </h5>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        Zoom: {zoomLevel.toFixed(1)}x
                      </span>
                      <button 
                        onClick={toggleMeasurement}
                        style={{ 
                          padding: '4px 12px', 
                          backgroundColor: measurementEnabled ? '#FF5722' : '#607d8b', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title={measurementEnabled ? 'Disable measurement mode' : 'Enable measurement mode'}
                      >
                        📏 {measurementEnabled ? 'Measuring' : 'Measure'}
                      </button>
                      {measurementEnabled && (measurementLine1 !== null || measurementLine2 !== null) && (
                        <button 
                          onClick={clearMeasurementLines}
                          style={{ 
                            padding: '4px 12px', 
                            backgroundColor: '#dc3545', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title="Clear measurement lines"
                        >
                          ✕ Clear
                        </button>
                      )}
                      <button 
                        onClick={resetZoom}
                        style={{ 
                          padding: '4px 12px', 
                          backgroundColor: '#6c757d', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title="Reset zoom and pan"
                      >
                        🔄 Reset View
                      </button>
                    </div>
                  </div>
                  <div style={{ 
                    backgroundColor: '#fafafa', 
                    padding: '12px', 
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}>
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={400}
                      onWheel={handleWheel}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      style={{ 
                        width: '100%', 
                        height: 'auto',
                        display: 'block',
                        cursor: measurementEnabled ? 'crosshair' : (isDragging ? 'grabbing' : 'grab')
                      }}
                    />
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#666', 
                      marginTop: '8px',
                      textAlign: 'center'
                    }}>
                      {measurementEnabled ? (
                        <>
                          � <span style={{ color: '#FF5722' }}>Click to place/drag measurement lines</span> • 
                          <span style={{ color: '#FF5722' }}> L1</span> and <span style={{ color: '#4CAF50' }}>L2</span>
                        </>
                      ) : (
                        '�💡 Scroll to zoom • Drag to pan'
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#666', 
              border: '1px dashed #ccc',
              borderRadius: '4px'
            }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>📊</div>
              <div>Select a dataset from the list to view its contents</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Historical data will be displayed here</div>
            </div>
          )}
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
                style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
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
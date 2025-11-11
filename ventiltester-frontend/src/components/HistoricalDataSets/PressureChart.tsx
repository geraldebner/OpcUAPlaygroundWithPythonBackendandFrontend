import React, { useEffect } from 'react';
import { LoadedData, ChartZoomState, MeasurementState } from './types';

interface PressureChartProps {
  loadedData: LoadedData | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  zoomState: ChartZoomState;
  measurementState: MeasurementState;
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onResetZoom: () => void;
  onToggleMeasurement: () => void;
  onClearMeasurementLines: () => void;
  getMesskurveData: () => number[] | null;
}

export default function PressureChart({
  loadedData,
  canvasRef,
  zoomState,
  measurementState,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onResetZoom,
  onToggleMeasurement,
  onClearMeasurementLines,
  getMesskurveData
}: PressureChartProps) {
  const { zoomLevel, panOffset, isDragging } = zoomState;
  const { enabled: measurementEnabled, line1: measurementLine1, line2: measurementLine2 } = measurementState;

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
    const values = messkurveData.filter((v: number) => v !== 0);
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
    const pointInterval = Math.max(1, Math.floor(visibleDataPoints / 200));
    
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
      
      const drawMeasurementLine = (dataIndex: number, color: string, label: string) => {
        if (dataIndex < startIndex || dataIndex > endIndex) return null;
        
        const value = messkurveData[dataIndex];
        const normalizedX = (dataIndex - startIndex) / (endIndex - startIndex);
        const x = padding.left + (chartWidth * normalizedX);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        
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
      
      if (line1Info && line2Info) {
        const indexDiff = Math.abs(line2Info.dataIndex - line1Info.dataIndex);
        const valueDiff = (line2Info.value - line1Info.value).toFixed(1);
        const midX = (line1Info.x + line2Info.x) / 2;
        
        ctx.strokeStyle = '#9C27B0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(line1Info.x, height - padding.bottom + 10);
        ctx.lineTo(line2Info.x, height - padding.bottom + 10);
        ctx.stroke();
        
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

  const messkurveData = getMesskurveData();
  if (!messkurveData) return null;

  return (
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
            onClick={onToggleMeasurement}
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
              onClick={onClearMeasurementLines}
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
            onClick={onResetZoom}
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
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
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
              📏 <span style={{ color: '#FF5722' }}>Click to place/drag measurement lines</span> • 
              <span style={{ color: '#FF5722' }}> L1</span> and <span style={{ color: '#4CAF50' }}>L2</span>
            </>
          ) : (
            '💡 Scroll to zoom • Drag to pan'
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { LoadedData, ChartZoomState, MeasurementState } from './types';
import { getMesskurveData } from './utils';

export function useChartInteractions(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  loadedData: LoadedData | null
) {
  // Chart zoom and pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Measurement lines state
  const [measurementEnabled, setMeasurementEnabled] = useState<boolean>(false);
  const [measurementLine1, setMeasurementLine1] = useState<number | null>(null);
  const [measurementLine2, setMeasurementLine2] = useState<number | null>(null);
  const [draggingLine, setDraggingLine] = useState<number | null>(null);

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
    const messkurveData = getMesskurveData(loadedData);
    if (!messkurveData) return null;

    const padding = { left: 60, right: 40 };
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const chartWidth = canvas.width - padding.left - padding.right;
    
    const dataLength = messkurveData.length;
    const visibleRange = dataLength / zoomLevel;
    const centerIndex = dataLength / 2 - (panOffset.x * dataLength / (chartWidth * zoomLevel));
    const startIndex = Math.max(0, Math.floor(centerIndex - visibleRange / 2));
    const endIndex = Math.min(dataLength - 1, Math.ceil(centerIndex + visibleRange / 2));
    
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
    const messkurveData = getMesskurveData(loadedData);
    if (!messkurveData) return null;
    
    const dataLength = messkurveData.length;
    const visibleRange = dataLength / zoomLevel;
    const centerIndex = dataLength / 2 - (panOffset.x * dataLength / (chartWidth * zoomLevel));
    const startIndex = Math.max(0, Math.floor(centerIndex - visibleRange / 2));
    const endIndex = Math.min(dataLength - 1, Math.ceil(centerIndex + visibleRange / 2));
    
    const threshold = 10;
    
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

  // Handle mouse down
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>): void {
    const coords = getCanvasCoords(e);
    
    if (measurementEnabled) {
      const nearbyLine = getNearbyMeasurementLine(coords.x);
      if (nearbyLine !== null) {
        setDraggingLine(nearbyLine);
        return;
      }
      
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
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y
    });
  }

  // Handle mouse move
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

  const zoomState: ChartZoomState = {
    zoomLevel,
    panOffset,
    isDragging,
    dragStart
  };

  const measurementState: MeasurementState = {
    enabled: measurementEnabled,
    line1: measurementLine1,
    line2: measurementLine2,
    draggingLine
  };

  return {
    zoomState,
    measurementState,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoom,
    toggleMeasurement,
    clearMeasurementLines
  };
}

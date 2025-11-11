export interface Snapshot {
  id: number;
  name: string;
  createdAt: string;
  comment?: string;
  identifierNumber?: number;
}

export interface LoadedData {
  id: number;
  name: string;
  comment?: string;
  identifierNumber?: number;
  createdAt: string;
  data: any;
}

export interface ChartZoomState {
  zoomLevel: number;
  panOffset: { x: number; y: number };
  isDragging: boolean;
  dragStart: { x: number; y: number };
}

export interface MeasurementState {
  enabled: boolean;
  line1: number | null;
  line2: number | null;
  draggingLine: number | null;
}

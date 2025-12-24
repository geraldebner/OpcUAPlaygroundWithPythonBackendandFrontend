export interface Snapshot {
  id: number;
  name: string;
  createdAt: string;
  comment?: string;
  identifierNumber?: number;
  testRunMessID?: number;
}

export interface TestRunInfo {
  messID: number;
  testType: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  comment?: string;
}

export interface LoadedData {
  id: number;
  name: string;
  comment?: string;
  identifierNumber?: number;
  createdAt: string;
  data: any;
  testRun?: TestRunInfo;
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

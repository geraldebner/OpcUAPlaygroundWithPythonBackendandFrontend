// Shared TypeScript type definitions for the VentilTester application

export interface Parameter {
  name: string;
  value: string;
  nodeId?: string;
}

export interface Block {
  index: number;
  groups?: { [groupKey: string]: Parameter[] };
}

export interface Dataset {
  id: number;
  name: string;
  comment: string;
  createdAt: string;
  blockIndex: number;
  payload?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
}

export interface BusyGroups {
  [key: string]: boolean;
}

export interface Edits {
  [key: string]: string;
}

export type TabType = 'live' | 'stored';

// Props interfaces for components
export interface ParametersViewProps {
  apiBase: string;
  selectedBlock: number | null;
}

export interface ParameterMappingPanelProps {
  selectedBlock: number | null;
  refreshBlock: (blockIndex: number) => Promise<void>;
  fetchMappingOnly: () => Promise<void>;
  isRefreshing: boolean;
  mappingLoading: boolean;
}

export interface ParameterLiveDataPanelProps {
  selectedBlock: number | null;
  blocks: Block[];
  autoRefresh: boolean;
  setAutoRefresh: (value: boolean) => void;
  isRefreshing: boolean;
  refreshBlock: (blockIndex: number) => Promise<void>;
  saveDataset: (blockIndex: number) => Promise<void>;
  writeBlockToOpc: (blockIndex: number) => Promise<void>;
  readGroup: (blockIndex: number, groupName: string) => Promise<void>;
  writeGroup: (blockIndex: number, groupName: string) => Promise<void>;
  readParam: (blockIndex: number, group: string, name: string) => Promise<void>;
  writeParam: (blockIndex: number, group: string, name: string) => Promise<void>;
  edits: Edits;
  getEditKey: (blockIndex: number, group: string, name: string) => string;
  busyGroups: BusyGroups;
  formatValue: (value: any) => string;
  setEdits: React.Dispatch<React.SetStateAction<Edits>>;
}

export interface ParameterDataSetPanelProps {
  parameterDatasets: Dataset[];
  datasetsLoading: boolean;
  loadParameterDataset: (id: number) => Promise<void>;
  writeDatasetToOpc: (id: number) => Promise<void>;
  deleteDataset: (id: number) => Promise<void>;
}

export interface CommandsMeasurementsViewProps {
  apiBase: string;
  selectedBlock: number | null;
}

export interface StatusViewProps {
  // Add props as needed
}
export interface MetricsOptions {
  view: 'table' | 'bars' | 'both';
  slowSeconds: number;
  showSummary: boolean;
}
export type RunStatus = 'Not observed' | 'Loading' | 'Streaming' | 'Done' | 'Error' | 'Interrupted';
export interface TimingRow {
  key: string;
  title: string;
  sources: string;
  status: RunStatus;
  requestKey?: string;
  start?: number;
  end?: number;
  duration?: number;
  timingSource?: 'SDK' | 'Observed';
  firstData?: number;
  sawLoading?: boolean;
  processing?: number;
  rows: number;
  frames: number;
  queries: number;
  errors: number;
  updates: number;
  history: number[];
}

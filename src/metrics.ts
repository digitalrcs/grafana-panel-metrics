import type { PanelData } from '@grafana/data';
import type { TimingRow } from './types';

export const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export const isRunning = (row: TimingRow) => row.status === 'Loading' || row.status === 'Streaming';
export function elapsed(row: TimingRow, now: number): number | undefined {
  return isRunning(row) && row.start !== undefined ? Math.max(0, now - row.start) : row.duration;
}
export function duration(ms?: number): string {
  if (!finite(ms)) {
    return '—';
  }
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)} s`;
  }
  if (ms < 3600000) {
    return `${(ms / 60000).toFixed(2)} m`;
  }
  return `${(ms / 3600000).toFixed(2)} h`;
}
export function emptyRow(key: string, title: string, sources: string): TimingRow {
  return {
    key,
    title,
    sources,
    status: 'Not observed',
    rows: 0,
    frames: 0,
    queries: 0,
    errors: 0,
    updates: 0,
    history: [],
  };
}

/** Retain metadata only, never query text, field values, or error messages. */
export function ingest(previous: TimingRow, data: PanelData, now: number, cutoff = 0): TimingRow {
  const request = data.request;
  if (!request || !finite(request.startTime) || request.startTime < cutoff) {
    return previous;
  }
  const requestKey = `${request.requestId}:${request.startTime}`;
  if (previous.start !== undefined && request.startTime < previous.start) {
    return previous;
  }
  const fresh = previous.requestKey !== requestKey;
  const row = fresh
    ? { ...emptyRow(previous.key, previous.title, previous.sources), history: previous.history }
    : { ...previous };
  row.requestKey = requestKey;
  row.start = request.startTime;
  row.queries = request.targets.filter((t) => !t.hide).length;
  row.updates++;
  row.errors = data.errors?.length || (data.state === 'Error' ? 1 : 0);
  const terminal = data.state === 'Done' || data.state === 'Error';
  // Loading can contain retained frames from the previous request.
  if (data.state !== 'Loading' && data.state !== 'NotStarted') {
    row.frames = data.series.length;
    row.rows = data.series.reduce((sum, frame) => sum + frame.length, 0);
    if (row.sawLoading && row.firstData === undefined && row.frames > 0) {
      row.firstData = Math.max(0, now - request.startTime);
    }
  }
  row.processing = finite(data.timings?.dataProcessingTime) ? data.timings?.dataProcessingTime : undefined;
  if (terminal) {
    const wasTerminal = !fresh && (previous.status === 'Done' || previous.status === 'Error');
    row.status = data.state === 'Error' || row.errors > 0 ? 'Error' : 'Done';
    const sdkEnd = finite(request.endTime) && request.endTime >= request.startTime;
    row.end = sdkEnd ? request.endTime : wasTerminal ? previous.end : now;
    row.timingSource = sdkEnd ? 'SDK' : 'Observed';
    row.duration = Math.max(0, row.end! - request.startTime);
    row.history = wasTerminal ? [...row.history.slice(0, -1), row.duration] : [...row.history, row.duration].slice(-50);
  } else if (data.state === 'Loading' || data.state === 'Streaming') {
    row.status = data.state;
    if (data.state === 'Loading') {
      row.sawLoading = true;
    }
    row.end = undefined;
    row.duration = undefined;
  } else if (isRunning(row)) {
    row.status = 'Interrupted';
    row.end = now;
    row.duration = Math.max(0, now - request.startTime);
    row.timingSource = 'Observed';
  }
  return row;
}

export function summarize(rows: TimingRow[], now: number) {
  const values = rows
    .map((r) => elapsed(r, now))
    .filter(finite)
    .sort((a, b) => a - b);
  const starts = rows.map((r) => r.start).filter(finite);
  const ends = rows.map((r) => (isRunning(r) ? now : r.end)).filter(finite);
  const total = values.reduce((a, b) => a + b, 0);
  return {
    measured: values.length,
    total: values.length ? total : undefined,
    longest: values.at(-1),
    average: values.length ? total / values.length : undefined,
    p95: values.length ? values[Math.ceil(values.length * 0.95) - 1] : undefined,
    span: starts.length && ends.length ? Math.max(0, Math.max(...ends) - Math.min(...starts)) : undefined,
    running: rows.filter(isRunning).length,
    failed: rows.filter((r) => r.status === 'Error').length,
    rows: rows.reduce((n, r) => n + r.rows, 0),
  };
}

export function toCsv(rows: TimingRow[], now: number): string {
  const cell = (value: unknown) => {
    let text = value === undefined ? '' : String(value);
    if (/^[=+@\-\t\r]/.test(text)) {
      text = `'${text}`;
    }
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [
    ['Panel', 'Source group', 'Status', 'Elapsed ms', 'Timing source', 'Rows', 'Frames', 'Queries', 'Errors'],
    ...rows.map((r) => [
      r.title,
      r.sources,
      r.status,
      elapsed(r, now),
      r.timingSource,
      r.rows,
      r.frames,
      r.queries,
      r.errors,
    ]),
  ]
    .map((r) => r.map(cell).join(','))
    .join('\r\n');
}

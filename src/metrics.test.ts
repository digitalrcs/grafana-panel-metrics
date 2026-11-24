import type { PanelData } from '@grafana/data';
import { duration, elapsed, emptyRow, ingest, summarize, toCsv } from './metrics';
const base = () => emptyRow('p1', 'Splunk panel 1', 'splunk');
function data(state: string, start = 1000, end?: number, count = 0): PanelData {
  return {
    state,
    series: count ? [{ length: count, fields: [] }] : [],
    request: {
      requestId: `r${start}`,
      startTime: start,
      endTime: end,
      targets: [{ refId: 'A' }, { refId: 'B', hide: true }],
    },
  } as unknown as PanelData;
}
test('long-running query keeps counting until final data, including queue time', () => {
  let row = ingest(base(), data('Loading'), 1000);
  expect(elapsed(row, 325000)).toBe(324000);
  row = ingest(row, data('Done', 1000, 325000, 200), 325010);
  expect(row.duration).toBe(324000);
  expect(duration(row.duration)).toBe('5.40 m');
  expect(row.rows).toBe(200);
  expect(row.queries).toBe(1);
  expect(elapsed(row, 999999)).toBe(324000);
});
test('streaming partial results do not finish a run even with an endTime', () => {
  let row = ingest(base(), data('Loading'), 1000);
  row = ingest(row, data('Streaming', 1000, 2000, 10), 2100);
  expect(row.duration).toBeUndefined();
  expect(row.status).toBe('Streaming');
  expect(row.firstData).toBe(1100);
  expect(elapsed(row, 5000)).toBe(4000);
});
test('ignores retained frames while loading', () => {
  const row = ingest(base(), data('Loading', 1000, undefined, 100), 1000);
  expect(row.rows).toBe(0);
  expect(row.firstData).toBeUndefined();
});
test('late mount recovers SDK timing but cannot recover first data', () => {
  const row = ingest(base(), data('Done', 1000, 3000, 10), 9000);
  expect(row.duration).toBe(2000);
  expect(row.firstData).toBeUndefined();
  expect(row.timingSource).toBe('SDK');
});
test('missing end timestamp is visibly an estimate and stays fixed', () => {
  const row = ingest(base(), data('Done'), 4000);
  const next = ingest(row, data('Done'), 9000);
  expect(next.duration).toBe(3000);
  expect(next.timingSource).toBe('Observed');
  expect(next.history).toEqual([3000]);
});
test('duplicates do not add history and later SDK end can correct observed estimate', () => {
  let row = ingest(base(), data('Done'), 4000);
  row = ingest(row, data('Done', 1000, 3500), 9000);
  expect(row.history).toEqual([2500]);
  expect(row.timingSource).toBe('SDK');
});
test('refresh replaces latest run and preserves bounded completed history', () => {
  let row = base();
  for (let i = 1; i <= 60; i++) {
    row = ingest(row, data('Done', i * 1000, i * 1000 + 100), i * 1000 + 200);
  }
  expect(row.history).toHaveLength(50);
  row = ingest(row, data('Loading', 61000), 61000);
  expect(row.duration).toBeUndefined();
  expect(row.rows).toBe(0);
  expect(row.firstData).toBeUndefined();
});
test('out-of-order old results and pre-clear requests cannot replace observations', () => {
  const row = ingest(base(), data('Done', 5000, 6000), 7000);
  expect(ingest(row, data('Done', 1000, 2000), 8000)).toBe(row);
  const cleared = base();
  expect(ingest(cleared, data('Done', 1000, 2000), 8000, 7000)).toBe(cleared);
});
test('errors finish with duration; malformed time is unavailable', () => {
  expect(ingest(base(), data('Error', 1000, 6000), 6000).status).toBe('Error');
  expect(ingest(base(), data('Done', NaN, 6000), 6000).duration).toBeUndefined();
  expect(ingest(base(), data('Done', 1000, 500), 2000).timingSource).toBe('Observed');
});
test('parallel durations distinguish cumulative from request span', () => {
  const a = ingest(base(), data('Done', 1000, 5000), 5000);
  const b = ingest(emptyRow('p2', 'Second', 'ds'), data('Done', 2000, 6000), 6000);
  expect(summarize([a, b], 6000)).toMatchObject({ total: 8000, longest: 4000, span: 5000, average: 4000, p95: 4000 });
});
test('no observations produce unavailable timings, not zero', () => {
  expect(summarize([base()], 9000).total).toBeUndefined();
  expect(duration(undefined)).toBe('—');
});
test('CSV escapes quotes, commas and spreadsheet formulas', () => {
  const csv = toCsv([{ ...base(), title: '=SUM(1,2)"' }], 1000);
  expect(csv).toContain('"\'=SUM(1,2)"""');
});

test('late duplicate terminal data never invents first-data timing', () => {
  const row = ingest(base(), data('Done', 1000, 2000, 10), 9000);
  expect(ingest(row, data('Done', 1000, 2000, 10), 9500).firstData).toBeUndefined();
});

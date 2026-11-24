import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import type { GrafanaTheme2, PanelProps } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { duration, elapsed, finite, isRunning, summarize, toCsv } from '../metrics';
import { DashboardObserver, Snapshot } from '../sceneAdapter';
import type { MetricsOptions } from '../types';

export function MetricsPanel({ options, width, height }: PanelProps<MetricsOptions>) {
  const styles = useStyles2(getStyles);
  const [snapshot, setSnapshot] = useState<Snapshot>({ rows: [], supported: true });
  const [now, setNow] = useState(Date.now);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('slowest');
  const [group, setGroup] = useState(false);
  const [selection, setSelection] = useState<{ base: string; value: MetricsOptions['view'] }>();
  const view = selection && selection.base === options.view ? selection.value : options.view || 'both';
  const observer = useRef<DashboardObserver | null>(null);
  useEffect(() => {
    const collector = new DashboardObserver((s) => {
      setSnapshot(s);
      setNow(Date.now());
    });
    observer.current = collector;
    const stop = collector.start();
    return () => {
      stop();
      observer.current = null;
    };
  }, []);
  const rows = useMemo(
    () =>
      snapshot.rows
        .filter((r) => `${r.title} ${r.sources} ${r.status}`.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) =>
          sort === 'name' ? a.title.localeCompare(b.title) : (elapsed(b, now) ?? -1) - (elapsed(a, now) ?? -1)
        ),
    [snapshot.rows, filter, sort, now]
  );
  const summary = summarize(rows, now);
  const groups = new Map<string, { key: string; label: string; value: number; measured: number }>();
  for (const row of rows) {
    const key = group ? row.sources : row.key;
    const item = groups.get(key) ?? { key, label: group ? row.sources : row.title, value: 0, measured: 0 };
    const ms = elapsed(row, now);
    if (finite(ms)) {
      item.value += ms;
      item.measured++;
    }
    groups.set(key, item);
  }
  const bars = [...groups.values()].sort((a, b) => b.value - a.value);
  const maximum = Math.max(1, ...bars.map((b) => b.value));
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows, now)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'grafana-panel-timings.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className={styles.root} style={{ width, height }} aria-label="Dashboard execution metrics">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>DIGITALRCS / PANEL METRICS</span>
          <h3>Dashboard execution</h3>
        </div>
        <span className={styles.live}>{summary.running ? `${summary.running} running` : 'Observing'}</span>
      </div>
      <p className={styles.note}>Query lifecycle timing · current browser session · latest request per panel</p>
      {!snapshot.supported ? (
        <div role="alert" className={styles.notice}>
          {snapshot.message}
        </div>
      ) : (
        <>
          {options.showSummary !== false && (
            <div className={styles.stats}>
              {[
                ['Longest', duration(summary.longest)],
                ['Cumulative', duration(summary.total)],
                ['Latest request span', duration(summary.span)],
                ['Average', duration(summary.average)],
                ['P95', duration(summary.p95)],
                ['Measured / discovered', `${summary.measured} / ${rows.length}`],
                ['Failed / running', `${summary.failed} / ${summary.running}`],
                ['Returned rows', summary.rows.toLocaleString()],
              ].map(([label, value]) => (
                <div className={styles.stat} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}
          <div className={styles.toolbar}>
            <input
              aria-label="Filter panels"
              placeholder="Filter panels or sources…"
              value={filter}
              onChange={(e) => setFilter(e.currentTarget.value)}
            />
            <select
              aria-label="View"
              value={view}
              onChange={(e) =>
                setSelection({ base: options.view, value: e.currentTarget.value as MetricsOptions['view'] })
              }
            >
              <option value="both">Table + bars</option>
              <option value="table">Table</option>
              <option value="bars">Bars</option>
            </select>
            <select aria-label="Sort panels" value={sort} onChange={(e) => setSort(e.currentTarget.value)}>
              <option value="slowest">Slowest first</option>
              <option value="name">Panel name</option>
            </select>
            <button onClick={exportCsv} disabled={!rows.length}>
              Export CSV
            </button>
            <button onClick={() => observer.current?.clear()}>Clear observations</button>
          </div>
          {!rows.length && (
            <p className={styles.notice}>
              {filter
                ? 'No panels match this filter.'
                : 'Waiting for dashboard panels. Refresh the dashboard to observe a new run; unloaded panels are not activated by this plugin.'}
            </p>
          )}
          {view !== 'table' && rows.length > 0 && (
            <div className={styles.chart}>
              <div className={styles.chartHeading}>
                <strong>{group ? 'Cumulative time by source group' : 'Execution time by panel'}</strong>
                <label>
                  <input type="checkbox" checked={group} onChange={(e) => setGroup(e.currentTarget.checked)} /> Group by
                  source
                </label>
              </div>
              {bars.map((bar) => (
                <div className={styles.barRow} key={bar.key}>
                  <span title={bar.label}>{bar.label}</span>
                  <div className={styles.track}>
                    <div style={{ width: `${(bar.value / maximum) * 100}%` }} />
                  </div>
                  <strong>{duration(bar.measured ? bar.value : undefined)}</strong>
                </div>
              ))}
            </div>
          )}
          {view !== 'bars' && rows.length > 0 && (
            <div className={styles.tableWrap}>
              <table>
                <caption>Latest observed query execution by panel</caption>
                <thead>
                  <tr>
                    {[
                      'Panel / source',
                      'State',
                      'Elapsed',
                      'First data¹',
                      'Processing',
                      'Rows',
                      'Frames',
                      'Queries',
                      'Last 50 runs',
                    ].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const ms = elapsed(row, now);
                    const slow = finite(ms) && ms >= (options.slowSeconds ?? 30) * 1000;
                    return (
                      <tr key={row.key}>
                        <td>
                          <strong>{row.title}</strong>
                          <small>{row.sources}</small>
                        </td>
                        <td>
                          <span
                            className={
                              row.status === 'Error' ? styles.error : isRunning(row) ? styles.live : styles.state
                            }
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className={slow ? styles.slow : ''}>
                          <strong>{duration(ms)}</strong>
                          <small>
                            {isRunning(row)
                              ? 'Live elapsed'
                              : row.timingSource === 'Observed'
                                ? 'Observed estimate'
                                : row.timingSource === 'SDK'
                                  ? 'SDK timestamps'
                                  : ''}
                          </small>
                        </td>
                        <td>{duration(row.firstData)}</td>
                        <td>{duration(row.processing)}</td>
                        <td>{row.requestKey ? row.rows.toLocaleString() : '—'}</td>
                        <td>{row.requestKey ? row.frames : '—'}</td>
                        <td>{row.requestKey ? row.queries : '—'}</td>
                        <td>
                          {row.history.length ? (
                            <span
                              title={`Completed requests: ${row.history.length}; min ${duration(Math.min(...row.history))}; max ${duration(Math.max(...row.history))}`}
                            >
                              <svg
                                width="90"
                                height="24"
                                role="img"
                                aria-label={`${row.history.length} completed request durations`}
                                viewBox="0 0 90 24"
                              >
                                <polyline
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  points={row.history
                                    .map(
                                      (v, i) =>
                                        `${2 + (i / Math.max(1, row.history.length - 1)) * 86},${22 - (v / Math.max(1, ...row.history)) * 20}`
                                    )
                                    .join(' ')}
                                />
                                {row.history.length === 1 && <circle cx="2" cy="2" r="2" fill="currentColor" />}
                              </svg>
                              <small>
                                {row.history.length} run{row.history.length === 1 ? '' : 's'}
                              </small>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <details className={styles.notes}>
            <summary>What these timings measure</summary>
            <p>
              Elapsed covers the data request lifecycle, including queue/poll time when the data source keeps its
              request Loading or Streaming. It does not measure final grid rendering, server CPU time, or queue time
              separately. Streaming requests stay open.
            </p>
            <p>
              SDK timestamps are preferred; completion observed without an end timestamp is an estimate. ¹ First data is
              observed only when the loading phase was seen; it may include browser scheduling delay. Processing is
              reported by Grafana when available.
            </p>
            <p>
              Summaries follow the filter and include live elapsed times. Cumulative adds overlapping panel durations;
              it is not dashboard wall time. Latest request span runs from earliest start to latest end and can combine
              different refresh cycles. Source groups keep mixed-source panels together, without attributing the same
              duration to each source. Shared queries may be counted by more than one panel.
            </p>
            <p>
              Unloaded panels remain unobserved. Cancelled/deactivated requests may be interrupted; cancellation is not
              always exposed. Clear observations then refresh to start a fresh measurement window. No query data or
              timings are persisted. This read-only adapter depends on Grafana Scenes internals.
            </p>
          </details>
        </>
      )}
    </section>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  root: css`
    overflow: auto;
    padding: 16px;
    color: ${theme.colors.text.primary};
    font-size: 12px;
    box-sizing: border-box;
  `,
  heading: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    h3 {
      margin: 5px 0;
      font-size: 20px;
    }
  `,
  eyebrow: css`
    font-size: 10px;
    letter-spacing: 1.5px;
    color: ${theme.colors.text.secondary};
  `,
  note: css`
    color: ${theme.colors.text.secondary};
    margin: 4px 0 18px;
  `,
  stats: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  `,
  stat: css`
    background: ${theme.colors.background.secondary};
    border: 1px solid ${theme.colors.border.weak};
    border-radius: 5px;
    padding: 12px;
    span {
      display: block;
      color: ${theme.colors.text.secondary};
      font-size: 11px;
    }
    strong {
      display: block;
      font-size: 22px;
      font-weight: 500;
      margin-top: 7px;
      font-variant-numeric: tabular-nums;
    }
  `,
  toolbar: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 18px;
    input,
    select,
    button {
      background: ${theme.colors.background.secondary};
      color: ${theme.colors.text.primary};
      border: 1px solid ${theme.colors.border.medium};
      border-radius: 4px;
      padding: 7px 9px;
    }
    select {
      height: 34px;
      min-height: 34px;
      line-height: normal;
      font: inherit;
    }
    input {
      flex: 1;
      min-width: 150px;
    }
    button {
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.5;
    }
    input:focus-visible,
    select:focus-visible,
    button:focus-visible {
      outline: 2px solid ${theme.colors.primary.main};
    }
  `,
  chart: css`
    border: 1px solid ${theme.colors.border.weak};
    border-radius: 5px;
    padding: 14px;
    margin-bottom: 18px;
  `,
  chartHeading: css`
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    label {
      display: flex;
      align-items: center;
      gap: 5px;
    }
  `,
  barRow: css`
    display: grid;
    grid-template-columns: minmax(90px, 25%) 1fr 80px;
    align-items: center;
    gap: 12px;
    margin: 12px 0;
    > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    strong {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  `,
  track: css`
    height: 14px;
    border-radius: 3px;
    background: ${theme.colors.background.secondary};
    > div {
      height: 100%;
      border-radius: 3px;
      background: ${theme.colors.primary.main};
      min-width: 0;
    }
  `,
  tableWrap: css`
    overflow-x: auto;
    table {
      width: 100%;
      border-collapse: collapse;
      white-space: nowrap;
    }
    caption {
      text-align: left;
      color: ${theme.colors.text.secondary};
      margin-bottom: 8px;
    }
    th {
      text-align: left;
      font-weight: 500;
      color: ${theme.colors.text.secondary};
      padding: 9px;
      border-bottom: 1px solid ${theme.colors.border.medium};
    }
    td {
      padding: 12px 9px;
      border-bottom: 1px solid ${theme.colors.border.weak};
      font-variant-numeric: tabular-nums;
    }
    td:first-child {
      min-width: 170px;
      max-width: 300px;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    small {
      display: block;
      color: ${theme.colors.text.secondary};
      font-size: 10px;
      margin-top: 4px;
    }
    svg {
      color: ${theme.colors.primary.main};
    }
  `,
  live: css`
    color: ${theme.colors.info.text};
    font-size: 11px;
    white-space: nowrap;
  `,
  state: css`
    color: ${theme.colors.text.secondary};
    font-size: 11px;
  `,
  error: css`
    color: ${theme.colors.error.text};
    font-size: 11px;
  `,
  slow: css`
    color: ${theme.colors.warning.text};
  `,
  notice: css`
    padding: 16px;
    border: 1px solid ${theme.colors.border.medium};
    border-radius: 4px;
    margin: 15px 0;
  `,
  notes: css`
    color: ${theme.colors.text.secondary};
    margin-top: 18px;
    line-height: 1.6;
    summary {
      cursor: pointer;
    }
    p {
      max-width: 1000px;
    }
  `,
});

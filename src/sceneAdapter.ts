import type { PanelData } from '@grafana/data';
import { emptyRow, ingest, isRunning } from './metrics';
import type { TimingRow } from './types';

export const PLUGIN_ID = 'digitalrcs-panelmetrics-panel';
// Isolated read-only boundary: the dashboard root is NOT a public SDK API.
export interface SceneNode {
  state: Record<string, unknown>;
  parent?: SceneNode;
  isActive?: boolean;
  subscribeToState: (handler: () => void) => { unsubscribe: () => void };
}
export function isNode(value: unknown): value is SceneNode {
  return (
    !!value &&
    typeof value === 'object' &&
    'state' in value &&
    !!value.state &&
    typeof value.state === 'object' &&
    'subscribeToState' in value &&
    typeof value.subscribeToState === 'function'
  );
}
export function dashboardRoot(): SceneNode | undefined {
  const root = (window as unknown as { __grafanaSceneContext?: unknown }).__grafanaSceneContext;
  return isNode(root) && root.isActive !== false ? root : undefined;
}
export function walk(root: SceneNode): SceneNode[] {
  const seen = new Set<SceneNode>();
  const queue = [root];
  while (queue.length && seen.size < 10000) {
    const node = queue.pop()!;
    if (seen.has(node)) {
      continue;
    }
    seen.add(node);
    for (const value of Object.values(node.state)) {
      if (isNode(value)) {
        queue.push(value);
      } else if (Array.isArray(value)) {
        for (const child of value) {
          if (isNode(child)) {
            queue.push(child);
          }
        }
      }
    }
  }
  return [...seen];
}
function providers(panel: SceneNode): SceneNode[] {
  const result: SceneNode[] = [];
  let node: SceneNode | undefined = panel;
  const seen = new Set<SceneNode>();
  while (node && !seen.has(node)) {
    seen.add(node);
    const data: unknown = node.state.$data;
    if (isNode(data)) {
      result.push(data);
      node = data;
    } else if (!result.length) {
      node = node.parent;
    } else {
      break;
    }
  }
  return result;
}
function panelData(value: unknown): value is PanelData {
  return !!value && typeof value === 'object' && 'state' in value && 'series' in value && Array.isArray(value.series);
}
export interface Snapshot {
  rows: TimingRow[];
  supported: boolean;
  message?: string;
}

export class DashboardObserver {
  private root?: SceneNode;
  private subscriptions = new Map<SceneNode, { unsubscribe: () => void }>();
  private rows = new Map<string, TimingRow>();
  private lastData = new Map<string, PanelData>();
  private cutoff = 0;
  private timer?: ReturnType<typeof setInterval>;
  private queued = false;
  private stopped = false;
  private panels: SceneNode[] = [];

  constructor(
    private emit: (snapshot: Snapshot) => void,
    private source = dashboardRoot,
    private clock = Date.now
  ) {}
  start() {
    this.scan();
    this.timer = setInterval(() => this.scan(), 1000);
    return () => this.stop();
  }
  clear() {
    this.cutoff = this.clock();
    this.rows.clear();
    this.lastData.clear();
    this.scan();
  }
  stop() {
    this.stopped = true;
    clearInterval(this.timer);
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions.clear();
    this.rows.clear();
    this.lastData.clear();
  }
  private schedule = () => {
    // Read synchronously so short Loading -> Done transitions are not lost to debounce.
    try {
      this.readData();
    } catch {
      /* Never propagate observer errors into Grafana's query lifecycle. */
    }
    if (!this.queued) {
      this.queued = true;
      queueMicrotask(() => {
        this.queued = false;
        if (!this.stopped) {
          this.scan();
        }
      });
    }
  };
  private readData() {
    for (const panel of this.panels) {
      const key = String(panel.state.key);
      const chain = providers(panel);
      const data = chain.map((p) => p.state.data).find(panelData);
      const refs = new Set<string>();
      const addRef = (ref: unknown) => {
        if (ref && typeof ref === 'object') {
          const r = ref as { uid?: string; type?: string };
          if (r.uid || r.type) {
            refs.add(r.uid || r.type!);
          }
        }
      };
      for (const provider of chain) {
        addRef(provider.state.datasource);
      }
      for (const query of data?.request?.targets ?? []) {
        if (!query.hide) {
          addRef(query.datasource);
        }
      }
      refs.delete('-- Mixed --');
      const sources = [...refs].sort().join(' + ') || 'Unavailable / shared';
      let row = {
        ...(this.rows.get(key) ?? emptyRow(key, '', sources)),
        title: String(panel.state.title || key),
        sources,
      };
      if (data && data !== this.lastData.get(key)) {
        row = ingest(row, data, this.clock(), this.cutoff);
        this.lastData.set(key, data);
      }
      if (isRunning(row) && chain.length > 0 && chain.every((p) => p.isActive === false)) {
        row = {
          ...row,
          status: 'Interrupted',
          end: this.clock(),
          duration: this.clock() - row.start!,
          timingSource: 'Observed',
        };
      }
      this.rows.set(key, row);
    }
  }
  scan() {
    if (this.stopped) {
      return;
    }
    try {
      const root = this.source();
      if (root !== this.root) {
        this.subscriptions.forEach((s) => s.unsubscribe());
        this.subscriptions.clear();
        this.rows.clear();
        this.lastData.clear();
        this.panels = [];
        this.cutoff = 0;
        this.root = root;
      }
      if (!root) {
        this.emit({
          rows: [],
          supported: false,
          message:
            'Dashboard timing is unavailable here. Open a Scenes dashboard. Legacy dashboards and frontend sandbox isolation are not supported.',
        });
        return;
      }
      const nodes = walk(root);
      const live = new Set(nodes);
      for (const [node, sub] of this.subscriptions) {
        if (!live.has(node)) {
          sub.unsubscribe();
          this.subscriptions.delete(node);
        }
      }
      for (const node of nodes) {
        if (!this.subscriptions.has(node)) {
          this.subscriptions.set(node, node.subscribeToState(this.schedule));
        }
      }
      this.panels = nodes
        .filter((n) => typeof n.state.pluginId === 'string' && n.state.pluginId !== PLUGIN_ID)
        .slice(0, 1000);
      const keys = new Set(this.panels.map((p) => String(p.state.key)));
      for (const key of this.rows.keys()) {
        if (!keys.has(key)) {
          this.rows.delete(key);
          this.lastData.delete(key);
        }
      }
      this.readData();
      this.emit({ rows: [...this.rows.values()], supported: true });
    } catch {
      this.emit({
        rows: [],
        supported: false,
        message: 'This Grafana dashboard structure is not supported by the timing adapter.',
      });
    }
  }
}

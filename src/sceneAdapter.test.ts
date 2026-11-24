import { DashboardObserver, PLUGIN_ID, SceneNode, Snapshot, walk } from './sceneAdapter';
function node(state: Record<string, unknown>) {
  const listeners = new Set<() => void>();
  return {
    state,
    isActive: true,
    listeners,
    subscribeToState: jest.fn((fn: () => void) => {
      listeners.add(fn);
      return { unsubscribe: () => listeners.delete(fn) };
    }),
    update(next: Record<string, unknown>) {
      Object.assign(state, next);
      listeners.forEach((fn) => fn());
    },
  };
}
const result = (state: string, start = 1000, end?: number) => ({
  state,
  series: [],
  request: {
    requestId: `${start}`,
    startTime: start,
    endTime: end,
    targets: [{ refId: 'A', datasource: { uid: 'splunk' } }],
  },
});
function fixture() {
  const provider = node({ data: result('Loading'), datasource: { uid: 'splunk' } });
  const panel = node({ key: 'panel-1', pluginId: 'table', title: 'Splunk panel 1', $data: provider });
  const self = node({ key: 'panel-2', pluginId: PLUGIN_ID });
  const root = node({ children: [panel, self] });
  let snapshot: Snapshot = { rows: [], supported: false };
  let now = 1000;
  const observer = new DashboardObserver(
    (s) => {
      snapshot = s;
    },
    () => root,
    () => now
  );
  return {
    provider,
    panel,
    root,
    observer,
    snapshot: () => snapshot,
    clock: (n: number) => {
      now = n;
    },
  };
}
test('observes existing data without activation or querying, and excludes metrics panels', () => {
  const f = fixture();
  f.observer.scan();
  expect(f.snapshot().rows).toHaveLength(1);
  expect(f.snapshot().rows[0].status).toBe('Loading');
  f.provider.update({ data: result('Done', 1000, 325000) });
  f.observer.scan();
  expect(f.snapshot().rows[0].duration).toBe(324000);
  f.observer.stop();
});
test('cleans up subscriptions on unmount', () => {
  const f = fixture();
  f.observer.scan();
  expect(f.provider.listeners.size).toBe(1);
  f.observer.stop();
  expect(f.provider.listeners.size).toBe(0);
  expect(f.root.listeners.size).toBe(0);
});
test('dynamically added/repeated panels appear and removed panels are forgotten', () => {
  const f = fixture();
  f.observer.scan();
  const another = node({
    key: 'panel-1-clone-0',
    pluginId: 'table',
    title: 'Repeat',
    $data: node({ data: result('Done', 2000, 3000) }),
  });
  f.root.update({ children: [another] });
  f.observer.scan();
  expect(f.snapshot().rows.map((r) => r.title)).toEqual(['Repeat']);
  expect(f.provider.listeners.size).toBe(0);
  f.observer.stop();
});
test('clear ignores current stale request until a new refresh', () => {
  const f = fixture();
  f.observer.scan();
  f.clock(10000);
  f.observer.clear();
  expect(f.snapshot().rows[0].status).toBe('Not observed');
  f.provider.update({ data: result('Done', 10001, 11000) });
  f.observer.scan();
  expect(f.snapshot().rows[0].duration).toBe(999);
  f.observer.stop();
});
test('navigation resets dashboard scope and unavailable root reports explicit limitation', () => {
  let root: SceneNode | undefined = node({ children: [node({ key: 'p', pluginId: 'table', title: 'First' })] });
  const emit = jest.fn();
  const observer = new DashboardObserver(emit, () => root);
  observer.scan();
  root = undefined;
  observer.scan();
  expect(emit).toHaveBeenLastCalledWith(expect.objectContaining({ supported: false, rows: [] }));
  observer.stop();
});
test('walk handles cycles without recursing into ordinary query JSON', () => {
  const root = node({});
  root.state.children = [root];
  root.state.query = { raw: { state: {} } };
  expect(walk(root)).toEqual([root]);
});

test('inactive providers remain unobserved and are never activated', () => {
  const provider = node({});
  provider.isActive = false;
  const activate = jest.fn();
  Object.assign(provider, { activate });
  const root = node({ children: [node({ key: 'lazy', title: 'Unloaded', pluginId: 'table', $data: provider })] });
  const emit = jest.fn();
  const observer = new DashboardObserver(emit, () => root);
  observer.scan();
  expect(emit.mock.calls[0][0].rows[0].status).toBe('Not observed');
  expect(activate).not.toHaveBeenCalled();
  observer.stop();
});

test('observer listener failures do not break the source event publisher', () => {
  const f = fixture();
  f.observer.scan();
  expect(() =>
    f.provider.update({ data: { state: 'Done', series: [null], request: { startTime: 1000 } } })
  ).not.toThrow();
  f.observer.scan();
  expect(f.snapshot().supported).toBe(false);
  f.observer.stop();
});

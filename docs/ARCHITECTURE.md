# Architecture and data handling

`MetricsPanel.tsx` owns one observer while mounted. `sceneAdapter.ts` discovers the current dashboard's scene graph and subscribes to state changes without activating providers. It also scans once per second for graph changes and live timer display. The metric reducer in `metrics.ts` processes SDK request metadata. Subscriptions, row state and references are released on unmount and dashboard-root changes.

Limits are 10,000 visited scene nodes, 1,000 represented panels and 50 terminal durations per panel. Query text and field values are not copied into history. Existing PanelData references are used for change detection and released with their panel. No persistent storage or network transport is used. CSV export is an explicit user action, and formula-like cell prefixes are escaped.

The observer never calls activate(), query(), refresh(), fetch(), a backend service, or Grafana's mutation APIs. The source tree has no production credentials. Development scaffolding and provisioning are outside the distributed frontend ZIP except the user documentation, license, changelog and screenshot.

## Internal API boundary

`window.__grafanaSceneContext`, `$data` provider traversal and scene graph state are internal implementation details. Public PanelProps exposes only this panel's data. The adapter is structural rather than importing minified Grafana classes. It feature-detects the root and catches observation errors so they do not propagate into query event publishers. This does not make the internal API stable. Compatibility requires runtime browser tests, not only TypeScript/API checks.

No final-render promise is inferred from Done. Queue waits are included only while the same request is active. Processing, data readiness, drawing, server execution and queue position are separate concepts; unsupported measurements are not invented.

## Dependencies

The runtime bundle externalizes React, @grafana/data, @grafana/ui and @emotion/css to Grafana's supplied modules. No third-party runtime implementation is bundled in module.js. The complete source/build dependency graph is in package-lock.json. Third-party attribution is in THIRD_PARTY_NOTICES.md. Apache-2.0 covers the plugin's original source and logo.

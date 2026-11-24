# Reviewer testing guide

Plugin ID: `digitalrcs-panelmetrics-panel`. Initial public review candidate: 1.0.0.

## Reproduce

Follow [CONTRIBUTING.md](../CONTRIBUTING.md) to build and start the disposable Docker environment (or a native Windows Grafana). No Splunk credentials, external services, customer data, or paid accounts are required. All queries use the included Grafana TestData datasource. Default local review login: admin / admin; loopback-only anonymous Admin is also available. No production credentials are provided or required.

Dashboard: http://127.0.0.1:3025/d/digitalrcs-panel-metrics-demo

1. At 1500 x 1800 or a comparable large viewport, keep Panel Metrics and the queried panels loaded. Refresh the dashboard.
2. The fast panel completes quickly; queued/slow synthetic queries take approximately 3 and 8 seconds. Both remain Loading while waiting, then become Done. The error panel reports Error. Timings include overhead and are not expected to equal exactly 3 or 8 seconds.
3. Longest should be roughly the eight-second request; cumulative should be roughly eleven seconds plus fast/error overhead. The difference demonstrates concurrent execution.
4. Filter for Fast results; summaries/table/chart narrow to that panel. Toggle Table/Bars/Both and Group by source. Export CSV and check milliseconds and source UID labels.
5. Clear observations. Rows become Not observed and no query is issued. Use Grafana Refresh to obtain new measurements.
6. Check the network panel: metrics controls do not send new data-source queries. Only Grafana refresh/lazy activation does so.
7. Repeat with a narrow viewport and both Grafana themes. Horizontal scrolling is provided for the table. Offscreen/unmounted panels can lose session history, as documented.
8. Inspect the unavailable message in an unsupported dashboard context rather than assuming zero timings.

## Review-sensitive implementation

`src/sceneAdapter.ts` reads `window.__grafanaSceneContext` and subscribes to scene-state changes. This is an **internal compatibility dependency**, not a stable public SDK. It is necessary for passive cross-panel observation with this design. Please assess acceptability explicitly during review. The plugin does not patch services, intercept requests, activate panels, or modify dashboard state. Unsupported contexts fail visibly. Public SDK data types are used for request timestamps/states and numeric frame metadata.

## Coverage and limits

Unit tests exercise long waits (324 seconds simulated), streaming partial responses, missing timestamps, stale/duplicate updates, refresh/history bounds, errors, observer cleanup, unavailable roots, dynamic/repeated panel keys, inactive providers, and CSV escaping. Real-browser tests exercise the provisioned dashboard and controls against 13.1.8 and 13.2.4. CI results and release artifacts are available in GitHub Actions.

No live Splunk installation, real five-minute wait, or final grid-paint timing was verified. The eight-second demo uses TestData's `slow_query`, not a real queue system. Sandbox-isolated/legacy contexts are unsupported. No backend, backend executable, telemetry endpoint, credential configuration, external font, or external script is shipped.

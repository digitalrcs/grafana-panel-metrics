# Dependency review

Audit scope: complete locked npm development/SDK graph, 2026-11-24. The first audit reported 27 moderate package findings (including propagated dependent packages), zero high and zero critical findings. Do not interpret the count as 27 distinct vulnerabilities.

| Dependency | Advisory | Exposure in this plugin |
| --- | --- | --- |
| glob | GHSA-3g3m-2fjr-6pw4 | Build/test filesystem traversal. Not bundled in module.js. |
| minimatch | GHSA-g3hv-75wg-m249 | Build/test glob matching. Not bundled in module.js. |
| i18next | GHSA-6jcc-5g8w-32mx | Transitive Grafana SDK dependency. The shipped module externalizes Grafana/UI modules; no i18next implementation is bundled. |
| react-router | GHSA-wrjc-x8rr-h8h6; GHSA-337j-9hxr-rhxg | Transitive Grafana SDK routing dependency. This plugin neither imports routing functions nor bundles a router. |

The suggested npm fixes included major SDK downgrades or incompatible major replacements. `npm audit fix --force` is deliberately not used. Replacing a local externalized SDK dependency does not patch the host Grafana runtime. Keep Grafana itself updated according to its security advisories. These findings remain disclosed for reviewer assessment; the project does not claim an entirely vulnerability-free dependency graph.

CI fails on high/critical npm advisories and on official validator errors. Run `npm audit` before each release and reconsider this assessment when the dependency graph or shipped code changes. Build inputs are limited to the public source tree; there is no feature for running arbitrary user-provided patterns in the build toolchain.

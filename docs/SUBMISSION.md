# Grafana submission — Panel Metrics 1.0.0

Prepared 2026-11-24. **Not submitted to Grafana.** This is an unsigned first-review candidate, not an approved/catalog-listed plugin.

## Exact submission values

| Form field | Value |
| --- | --- |
| Plugin | Panel Metrics (`digitalrcs-panelmetrics-panel`) |
| Version | 1.0.0 |
| Listing intent | Public (free); publisher must confirm eligibility/classification. |
| Plugin ZIP | https://github.com/digitalrcs/grafana-panel-metrics/releases/download/v1.0.0/digitalrcs-panelmetrics-panel-1.0.0.zip |
| SHA1 | `0930a3170be59169761b9230c3b761390248d939` |
| Matching source | https://github.com/digitalrcs/grafana-panel-metrics/tree/v1.0.0 |
| Source commit | `ef5fd28ff4800172e6997eb23b3cee65c3b4f66c` |
| Provisioning provided | Yes; dashboard and TestData datasource in the repository. |
| Testing guidance | https://github.com/digitalrcs/grafana-panel-metrics/blob/v1.0.0/docs/REVIEWER_GUIDE.md |
| Release/checksums/report | https://github.com/digitalrcs/grafana-panel-metrics/releases/tag/v1.0.0 |

SHA256: `1a5683612859af55d2725868f9597f507015d05e4661eaa2a87edc2ff59bf913`

The ZIP was downloaded through its public URL without authentication; its SHA1 and SHA256 matched the release sidecars. GitHub attestation verification succeeded for this digest, repository, release workflow and source commit. The [release workflow](https://github.com/digitalrcs/grafana-panel-metrics/actions/runs/45452139826) passed all build, unit, lint, type, audit, validator and Grafana 13.1.8/13.2.4 browser gates. Provenance is not a Grafana signature.

## Suggested testing-guidance text

> Panel Metrics observes query execution across the current Scenes dashboard without issuing queries or activating unloaded panels. The repository provides a synthetic TestData demo with fast, three-second, eight-second and error cases; no external service or production credentials are needed. Follow CONTRIBUTING.md to run the loopback-only review environment, then docs/REVIEWER_GUIDE.md to test elapsed time, summaries, chart/table controls, CSV export, clearing and refresh. Tests passed on Grafana 13.1.8 and 13.2.4. The read-only adapter uses the internal window.__grafanaSceneContext root; please explicitly assess this dependency. Legacy and frontend-isolated contexts are unsupported. Measurements are query lifecycle durations, not final grid rendering; Splunk-specific queue state is not verified. This is an unsigned initial submission; public signing awaits Grafana approval and signature-level assignment. Moderate transitive npm advisories are disclosed in docs/DEPENDENCY_REVIEW.md; none are high or critical in the recorded audit.

## Publisher decisions and remaining steps

- Confirm the Grafana Cloud organization owns the `digitalrcs` plugin prefix and that the submitting user is its administrator.
- Answer affiliation/commercial-product questions accurately. Community/Commercial classification is not determined by this repository's license or free price alone; Grafana assigns the signature level.
- Disclose the internal Scenes dependency and review the remaining questions in [PUBLICATION.md](PUBLICATION.md). The validator cannot grant policy approval.
- Submit through Grafana Cloud **Org Settings > My Plugins > Submit New Plugin**. No portal action has been performed by this work.
- After reviewer approval, arrange public signing with a secret plugins:write token and a new immutable signed release. Do not replace this tag/ZIP or apply a private signature as a substitute.

Do not substitute a local build, mutable branch, GitHub source-code ZIP, or a different checksum for these exact release values.

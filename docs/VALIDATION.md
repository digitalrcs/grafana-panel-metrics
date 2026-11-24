# Validation evidence

Verified on 2026-11-24. This records observed results, not Grafana catalog approval.

| Check | Result |
| --- | --- |
| TypeScript | Pass (`npm run typecheck`). |
| ESLint | Pass (`npm run lint`). |
| Unit tests | 21 passing tests in 2 suites. |
| Production build | Pass; external React/Grafana/Emotion modules, no backend. |
| Browser tests | Pass locally and in GitHub CI on Grafana 13.1.8 and 13.2.4. |
| Official validator 0.54.1 | Zero errors and only the expected `unsigned-plugin` warning; [raw report](evidence/validator-1.0.0.json). |
| Source-linked validation | Validator used exact public commit c26bd62249697f433108fc41e173c8171bef371d, matching the packaged source. |
| React compatibility | @grafana/react-detect 0.8.1: zero source and dependency issues; completed validator React check. |
| npm audit | Zero high/critical findings; 27 moderate package findings disclosed in DEPENDENCY_REVIEW.md. |
| Public-source check | Staged paths excluded local runtimes/data, authentication state, caches, build outputs and credentials. Secret-pattern scan found no matching private key/token/LAN-address/local-user-path material. This is not a formal security certification. |
| Private reporting | GitHub private vulnerability reporting enabled. |

[Initial complete CI run](https://github.com/digitalrcs/grafana-panel-metrics/actions/runs/45451079546) passed build and both real-Grafana browser jobs. Later release workflow runs revalidate the tagged source and attach the exact archive report/checksums.

The local validator's first attempt ran before the new repository's links propagated and found stale 404s, a generic license-template copyright, and a React scanner installation timeout. The license was corrected, public links verified, and the scanner install completed; a full rerun removed these warnings. No analyzer warning was waived except the documented first-submission unsigned notice.

Browser checks cover Loading -> Done, real eight-second TestData timing, errors, SDK timestamps, filtering, source grouping, view switching, CSV download, clear then refresh, no extra queries from metrics controls, and desktop/narrow layouts. Unit tests cover streaming and a simulated 324-second query. No real Splunk integration, true five-minute wait, final-render completion, or all-version compatibility is claimed.

The public release ZIP and its matching tag are the submission artifacts. Do not use the locally prepared ZIP's checksum for a different CI-built archive. Refer to the checksum sidecar attached to the release and verify the downloaded bytes. GitHub build provenance is separate from Grafana signing.

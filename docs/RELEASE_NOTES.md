# Panel Metrics 1.0.0 — initial public review candidate

Dashboard query duration table, horizontal bar chart, source grouping, running/error counts, longest/cumulative/average/p95/request-span summaries, session history and CSV export.

This archive is intentionally unsigned for initial Grafana review. It is not catalog-approved and is not advertised as available in Grafana Cloud. It requires Grafana 13.1.8 or later with a non-isolated Scenes dashboard. The read-only internal Scenes adapter requires explicit manual review. Final grid painting and Splunk-specific queue state are not measured.

The matching source is the immutable v1.0.0 tag. SHA1/SHA256 sidecars identify the exact ZIP; GitHub provenance attests its CI build. Provenance is not a Grafana plugin signature. Consult CONTRIBUTING.md for local review installation, docs/REVIEWER_GUIDE.md for test steps, and docs/PUBLICATION.md for the readiness checklist and remaining review questions.

The release is gated on type checking, lint, unit tests, dependency audit (high/critical threshold), official plugin validation, and real-browser CI on Grafana 13.1.8 and 13.2.4. Moderate transitive dependency advisories and their runtime boundary are documented in docs/DEPENDENCY_REVIEW.md.

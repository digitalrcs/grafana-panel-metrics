# Security policy

Supported security fixes apply to the latest published version. This project is initially a public review candidate, not a signed catalog plugin.

Report suspected vulnerabilities privately using this repository's **Security > Report a vulnerability** feature. If that feature is unavailable, contact the maintainer through the contact information on the DigitalRCS GitHub profile and request a private reporting channel. Do not post exploit details, credentials, customer data or unsanitized dashboards in a public issue.

The plugin does not require or store credentials, send telemetry, or initiate data queries. Exported CSV contains panel titles and source identifiers; handle those files according to your organization's data policies. The read-only dashboard collector relies on internal Grafana Scenes objects, and compatibility limitations are disclosed in the README and reviewer guide.

Only the disposable loopback demo uses default local credentials and anonymous Admin. Never use that demo configuration for a public or production Grafana instance.

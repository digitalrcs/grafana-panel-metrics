# Grafana publication readiness

## Status

Public source and a first-review release are being prepared. Catalog approval, signature-level assignment, public signing and catalog installation are separate steps. None is implied by a passing build, public GitHub repository, unsigned release or provenance attestation.

## Requirements and evidence

| Area | Implementation / evidence |
| --- | --- |
| License | Apache-2.0 in LICENSE; original source/logo; THIRD_PARTY_NOTICES.md. |
| Catalog documentation | README.md and src/README.md contain usage, metrics definitions, requirements, limitations and support; no install/build commands. |
| Developer installation | CONTRIBUTING.md contains build, isolated demo, unsigned local installation and restart instructions. |
| Metadata | Stable plugin ID, description, author, project/support links, SVG logo and real TestData screenshot. |
| Test environment | Provisioned dashboard and datasource; synthetic fast/slow/error queries; no external account required. |
| Tests | Unit tests and real-browser checks; CI covers Grafana 13.1.8 and 13.2.4. |
| Security/privacy | No telemetry, credentials, persistence, additional queries, remote fonts or external scripts in the plugin; explicit CSV export; bounded observations. |
| Dependencies | Locked npm tree, high/critical audit gate; moderate findings documented in DEPENDENCY_REVIEW.md. |
| Package | One plugin-ID directory, built module/assets, README, changelog, license; SHA1/SHA256 sidecars. |
| Validation | Official Grafana Plugin Validator runs in CI on the exact packaged ZIP; inspect the attached validator report, including warnings. |
| Provenance | Release workflow attests the exact ZIP. Verify with gh attestation verify; this is not Grafana signing. |
| Support | GitHub issues and SECURITY.md; no Grafana Labs support or endorsement claimed. |

## Explicit manual-review questions

1. **Internal Scenes access:** the read-only cross-panel collector uses `window.__grafanaSceneContext`. This is not a stable public SDK extension. No guarantee can be made that Grafana will approve it. If reviewers require public SDK-only access, cross-panel passive collection needs a supported Grafana extension before this design can qualify.
2. **Signature classification:** the publisher's business affiliation and intended offering determine Community versus Commercial classification. A free Apache-2.0 repository alone does not establish the signature level. The publisher must answer the affiliation/commercial-product questions accurately; Grafana assigns the level.
3. **Unsupported environments:** legacy and frontend-isolated dashboards do not expose the required root. The UI reports unavailable rather than bypassing isolation. Do not claim universal Grafana Cloud compatibility.
4. **Dependency advisories:** moderate transitive findings remain disclosed. Reviewers may require additional changes despite the shipped bundle excluding those implementations.
5. **Functional scope:** query timing is not final render timing; queues must remain in one active source request. Live Splunk behavior and real long-running streaming browser sessions have not been verified.

## Submission procedure

1. Wait for the release CI checks to pass and review all validator findings.
2. Use the immutable release ZIP and matching source tag, not a mutable main branch or GitHub source archive as the plugin binary. Verify public download and checksums. Record exact URLs and the 40-character SHA1 in a submission record.
3. A Grafana Cloud organization administrator opens **Org Settings > My Plugins > Submit New Plugin**, chooses the appropriate public listing, and supplies ZIP, checksum, matching source, and reviewer testing instructions. Provisioning is provided. No portal submission is performed by the repository workflows.
4. Disclose the internal adapter and all limitations in testing guidance. Supply publisher affiliation answers rather than guessing them.
5. Initial submissions may be unsigned. After Grafana grants a signature level, sign with a plugins:write access-policy token kept in a secret store, publish a new immutable signed artifact/version, verify it, and update the submission. Never create a private signature as a substitute for a public signature.

## Authoritative references (checked 2026-11-24)

- [Publishing best practices](https://grafana.com/developers/plugin-tools/publish-a-plugin/publishing-best-practices)
- [Plugin policy and accepted licenses](https://grafana.com/legal/plugins/)
- [Publish or update a plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/publish-a-plugin)
- [Signing and initial unsigned submission](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin)
- [Provide a review environment](https://grafana.com/developers/plugin-tools/publish-a-plugin/provide-test-environment)

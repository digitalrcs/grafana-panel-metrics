# Contributing and local installation

## Toolchain

Node.js 24.15.0+ (Node 24 LTS recommended), npm, Python 3 for packaging, and Docker Compose 2.24.4+ for the disposable Linux review environment. Windows users can use the native Grafana helper below. Commit `package-lock.json`; use `npm ci` for reproducible dependency resolution. Do not modify the generator-managed `.config` directory.

```sh
npm ci
npm run typecheck
npm run lint
npm run test:ci
npm run build
npm run package
```

## Unsigned development/review build

The initial submission is unsigned, as permitted by Grafana's first-submission process. Copy the contents of `dist` to `<grafana plugins>/digitalrcs-panelmetrics-panel`, allow only that ID in `[plugins] allow_loading_unsigned_plugins`, and restart the test Grafana instance. Do not present an unsigned ZIP as catalog approved. Restart Grafana after plugin metadata changes.

## Disposable Docker demo

```sh
npm run build
npm run server
```

The default image is Grafana 13.2.4. The compose override binds `127.0.0.1:3025`; it does not use a pre-existing port-3000 instance. Open http://127.0.0.1:3025/d/digitalrcs-panel-metrics-demo. The supplied provisioning uses synthetic TestData and loopback-only anonymous Admin for local review. Do not expose this configuration publicly.

To select the minimum tested version: `GRAFANA_VERSION=13.1.8 npm run server` on a POSIX shell. Stop with `docker compose down`. These are disposable test containers, not production configuration.

## Windows native demo

```powershell
.\scripts\Start-Demo.ps1 -GrafanaHome C:\path\to\grafana
```

The helper checks the port, uses its own `.local` data/config/plugins directories, installs the built plugin, and waits for health. It records the process ID in `.local/grafana.pid`. Stop only that verified process when finished. Use `-Port 3026 -Instance .local-second` for another version with separate storage. Never reuse a newer-version Grafana database with an older runtime.

## Browser tests

```sh
npx playwright install chromium
npm run e2e
```

`GRAFANA_URL` overrides the default `http://127.0.0.1:3025`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an existing Chromium executable. Tests use `@grafana/plugin-e2e`. Real 3-second and 8-second queries and a deterministic backend error demonstrate observable request lifecycle behavior. TestData is not a Splunk integration test.

## Change discipline

- Add focused regression tests for observer lifecycle and metric calculations.
- Confirm no extra `/api/ds/query` requests when using metrics controls.
- Keep the internal Scenes boundary in `src/sceneAdapter.ts`; do not mutate Grafana state or activate offscreen panels.
- Keep README.md and src/README.md identical. They are user-facing catalog documentation; put installation/build details here.
- Update CHANGELOG.md, test compatibility, and run the official validator before proposing a release.
- Read [reviewer testing](docs/REVIEWER_GUIDE.md), [architecture](docs/ARCHITECTURE.md), and [publication process](docs/PUBLICATION.md).

## Release

CI builds, tests, audits dependencies and validates the archive. A version tag builds a separate release artifact with SHA1/SHA256 and GitHub build provenance. Public signing is a separate stage after Grafana grants the plugin a signature level. Never reuse or overwrite a released tag or its ZIP. Use a new version if any submitted bytes change.

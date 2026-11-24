param(
  [Parameter(Mandatory=$true)][string]$GrafanaHome,
  [int]$Port = 3025,
  [ValidatePattern('^\.local(?:-[a-z0-9-]+)?$')][string]$Instance = '.local'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$demoRoot = Join-Path $projectRoot $Instance
$grafanaRoot = (Resolve-Path -LiteralPath $GrafanaHome).Path
$exe = Join-Path $grafanaRoot 'bin\grafana.exe'
if (!(Test-Path -LiteralPath $exe)) { throw "Grafana executable not found in $grafanaRoot" }
if (!(Test-Path -LiteralPath (Join-Path $projectRoot 'dist\module.js'))) { throw 'Run npm run build first.' }
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw "Port $Port is already in use." }
$pluginFolder = Join-Path $demoRoot 'plugins\digitalrcs-panelmetrics-panel'
$provisioning = Join-Path $demoRoot 'provisioning'
New-Item -ItemType Directory -Force $pluginFolder, "$demoRoot\data", "$demoRoot\logs", "$provisioning\dashboards", "$provisioning\datasources" | Out-Null
Copy-Item -Path "$projectRoot\dist\*" -Destination $pluginFolder -Recurse -Force
Copy-Item -LiteralPath "$projectRoot\provisioning\datasources\datasources.yml" -Destination "$provisioning\datasources\datasources.yml" -Force
$dashPath = "$projectRoot/provisioning/dashboards".Replace('\','/')
@"
apiVersion: 1
providers:
  - name: Panel Metrics demo
    type: file
    options:
      path: $dashPath
"@ | Set-Content "$provisioning\dashboards\default.yml"
@"
[server]
http_addr = 127.0.0.1
http_port = $Port
[paths]
data = $($demoRoot.Replace('\','/'))/data
logs = $($demoRoot.Replace('\','/'))/logs
plugins = $($demoRoot.Replace('\','/'))/plugins
provisioning = $($provisioning.Replace('\','/'))
[plugins]
allow_loading_unsigned_plugins = digitalrcs-panelmetrics-panel
preinstall_disabled = true
[analytics]
reporting_enabled = false
check_for_updates = false
[security]
admin_user = admin
admin_password = admin
[auth.anonymous]
enabled = true
org_role = Admin
"@ | Set-Content "$demoRoot\grafana.ini"
$process = Start-Process -FilePath $exe -ArgumentList @('server', '--homepath', ('"' + $grafanaRoot + '"'), '--config', ('"' + "$demoRoot\grafana.ini" + '"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput "$demoRoot\stdout.log" -RedirectStandardError "$demoRoot\stderr.log"
$process.Id | Set-Content "$demoRoot\grafana.pid"
$ready = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  if ($process.HasExited) { throw "Grafana exited. See $demoRoot\stdout.log and stderr.log." }
  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 1
    if ($health.database -eq 'ok') { $ready = $true; break }
  } catch { Start-Sleep -Milliseconds 500 }
}
if (!$ready) { throw "Grafana is still starting. Check $demoRoot\stdout.log before running browser tests." }
Write-Output "Started isolated Grafana PID $($process.Id): http://127.0.0.1:$Port/d/digitalrcs-panel-metrics-demo"

# One-click: build + deploy the Civil 3D MCP, start Civil 3D, open a scratch drawing,
# run every skill against it, and show the report.  Close Civil 3D before running.
$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { $node = "C:\Program Files\nodejs\node.exe" }
# Cemengal: results go to %TEMP%\Cemengal\Civil3DMCP\TestResults (tools/cem-temp.cjs), never next to this script
# (docs/decisions/0003-no-acc-writes-temp-folder.md).
$results = & $node (Join-Path $repo "tools\cem-temp.cjs") dir TestResults
if (-not $results) { Write-Host "tools\cem-temp.cjs failed" -ForegroundColor Red; exit 1 }

function Rpc([string]$method, [string]$paramsJson = "{}") {
  $js = "const s=require('net').connect(+(process.env.CIVIL3D_PORT||8766),'127.0.0.1');let b='';" +
        "s.on('connect',()=>s.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'$method',params:$paramsJson})));" +
        "s.on('data',d=>{b+=d;try{JSON.parse(b);console.log(b);s.end()}catch{}});s.on('error',e=>{console.log(JSON.stringify({error:{message:String(e)}}))});" +
        "setTimeout(()=>{console.log(JSON.stringify({error:{message:'timeout'}}));process.exit()},120000)"
  $out = & $node -e $js
  return ($out | Select-Object -First 1 | ConvertFrom-Json)
}

Write-Host "== 1/5 Checking Civil 3D is closed" -ForegroundColor Cyan
$running = @(Get-Process acad -ErrorAction SilentlyContinue)
if ($running.Count -gt 0) {
  Write-Host "Civil 3D / AutoCAD is running. Save your work, close it, and run this again." -ForegroundColor Red
  $running | ForEach-Object { Write-Host ("  PID {0}  started {1}  window '{2}'  responding={3}" -f $_.Id, $_.StartTime, $_.MainWindowTitle, $_.Responding) }
  $running | Select-Object Id, StartTime, MainWindowTitle, Responding, SessionId | Format-List | Out-File -Encoding utf8 (Join-Path $results "acad_running.txt")
  exit 1
}

Write-Host "== 2/5 Building and deploying (setup_claude.ps1)" -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo "setup_claude.ps1")
if ($LASTEXITCODE -ne 0) { Write-Host "Setup failed - see the setup log in $([IO.Path]::GetTempPath())Cemengal\Civil3DMCP" -ForegroundColor Red; exit 1 }

Write-Host "== 3/5 Starting Civil 3D" -ForegroundColor Cyan
$menus = @("$env:ProgramData\Microsoft\Windows\Start Menu\Programs", "$env:APPDATA\Microsoft\Windows\Start Menu\Programs")
$lnk = Get-ChildItem $menus -Recurse -Filter "*Civil 3D 20*.lnk" -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -notmatch "Object Enabler|Reset|Restablecer|Migrat|Exportar|Import" } |
  Sort-Object @{ e = { $_.Name -match "Metric|M.trico" }; Descending = $true }, @{ e = { $_.Name }; Descending = $true } |
  Select-Object -First 1
if (-not $lnk) { Write-Host "Civil 3D shortcut not found in the Start menu - start Civil 3D manually now." -ForegroundColor Yellow }
else { Write-Host "Launching: $($lnk.Name)"; Start-Process $lnk.FullName }

Write-Host "   Waiting for the MCP plugin (if Civil 3D asks about CEM_Civil3DMCP / Civil3dMcpPlugin.dll, choose 'Cargar siempre')..." -ForegroundColor Yellow
$deadline = (Get-Date).AddMinutes(8); $ping = $null
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 5
  $ping = Rpc "ping"
  if ($ping.result.pong) { break }
}
if (-not $ping.result.pong) { Write-Host "Plugin did not answer within 8 minutes." -ForegroundColor Red; exit 1 }
Write-Host "   Plugin $($ping.result.pluginVersion) is up." -ForegroundColor Green
Start-Sleep -Seconds 10   # let Civil 3D finish loading its UI

Write-Host "== 4/5 Opening a new scratch drawing" -ForegroundColor Cyan
Write-Host "   (close Civil 3D's 'Bienvenido'/Welcome panel and the DWG-association dialog if shown - they block the API)" -ForegroundColor Yellow
$nd = Rpc "newDrawing"
if ($nd.error) { Write-Host "newDrawing failed: $($nd.error.message) - open a new drawing manually and press Enter"; Read-Host }
else { Write-Host "   $($nd.result.drawing) from $($nd.result.template)" }
Start-Sleep -Seconds 5

Write-Host "== 5/5 Running every skill (tests\skills_test.cjs)" -ForegroundColor Cyan
& $node (Join-Path $PSScriptRoot "skills_test.cjs") --mark-verified
$report = Join-Path $results "report.md"
Write-Host ""
Write-Host "Report: $report" -ForegroundColor Green
Write-Host "Screenshots: $results\shot_*.png"
Write-Host "Now fully quit Claude (tray icon -> Quit) and reopen it to load the new MCP tools." -ForegroundColor Green

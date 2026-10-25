# Builds the Civil 3D MCP (Node server + .NET plugin), installs the plugin as an
# autoload bundle and registers the server with the Claude desktop app.
# Run: double-click setup_claude.bat (re-runnable). Another port than the default 8766: setup_claude.ps1 -Port <port>.
param([int]$Port = 8766)
$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
# Cemengal: the log is %TEMP%\Cemengal\Civil3DMCP\setup-yyyyMMdd.log (tools/cem-temp.cjs prunes the folder), never
# next to this script (docs/decisions/0003-no-acc-writes-temp-folder.md). Without Node there is no log: step 1 stops.
$log = if ($node) { & $node (Join-Path $repo "tools\cem-temp.cjs") log setup }
if ($log) { Start-Transcript -Path $log -Append | Out-Null }
try {
Write-Host "== Civil 3D MCP setup in $repo"
if ($log) { Write-Host "Log: $log" }

# ---- 1. Node MCP server --------------------------------------------------
$npm  = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $node -or -not $npm) { throw "Node.js not found on PATH. Install Node 18+ from nodejs.org and re-run." }
Write-Host "node: $node ($(& $node --version))"
Push-Location $repo
& $npm install --no-audit --no-fund 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
& $npm run build 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
Pop-Location
$indexJs = Join-Path $repo "build\index.js"
if (-not (Test-Path $indexJs)) { throw "build\index.js missing after build" }
Write-Host "MCP server built: $indexJs" -ForegroundColor Green

# ---- 2. Locate Civil 3D and copy reference DLLs -----------------------------
$acadDirs = @()
Get-ChildItem "HKLM:\SOFTWARE\Autodesk\AutoCAD" -ErrorAction SilentlyContinue | ForEach-Object {
  Get-ChildItem $_.PSPath -ErrorAction SilentlyContinue | ForEach-Object {
    $loc = (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).AcadLocation
    if ($loc) { $acadDirs += $loc }
  }
}
# fallbacks: the running acad.exe, then common install roots
Get-Process acad -ErrorAction SilentlyContinue | ForEach-Object { if ($_.Path) { $acadDirs += (Split-Path $_.Path) } }
foreach ($root in @("$env:ProgramFiles\Autodesk", "D:\Archivos de programa\Autodesk", "C:\Archivos de programa\Autodesk")) {
  if (Test-Path $root) {
    Get-ChildItem $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      $acadDirs += $_.FullName
      Get-ChildItem $_.FullName -Directory -ErrorAction SilentlyContinue | ForEach-Object { $acadDirs += $_.FullName }
    }
  }
}
$civilDir = $acadDirs | Select-Object -Unique | Where-Object { (Test-Path (Join-Path $_ "acad.exe")) -and ((Test-Path (Join-Path $_ "AeccDbMgd.dll")) -or (Test-Path (Join-Path $_ "C3D\AeccDbMgd.dll"))) } |
  Sort-Object { (Get-Item (Join-Path $_ "acad.exe")).VersionInfo.FileVersionRaw } -Descending |
  Select-Object -First 1
if (-not $civilDir) { throw "Could not find a Civil 3D install (AeccDbMgd.dll) via the registry." }
Write-Host "Civil 3D found in: $civilDir"
$refs = Join-Path $repo "C_References"
foreach ($dll in "accoremgd.dll","AcDbMgd.dll","acmgd.dll","AecBaseMgd.dll","AeccDbMgd.dll") {
  $src = @($civilDir, (Join-Path $civilDir "C3D"), (Join-Path $civilDir "ACA")) | ForEach-Object { Join-Path $_ $dll } | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $src) { $src = Get-ChildItem $civilDir -Recurse -Filter $dll -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName }
  Write-Host "  $dll <- $src"
  if (-not $src) { throw "Missing $dll in $civilDir" }
  Copy-Item $src $refs -Force
}
Write-Host "Reference DLLs copied" -ForegroundColor Green

# ---- 3. Build the plugin -----------------------------------------------------
# Civil 3D 2027 (R26) is built on .NET 10 -> the plugin needs the .NET 10 SDK
$dotnet = (Get-Command dotnet -ErrorAction SilentlyContinue).Source
$ErrorActionPreference = "Continue"   # .NET writes banners/warnings to stderr
$hasSdk10 = $dotnet -and ((& $dotnet --list-sdks 2>$null) -match '^10\.')
if (-not $hasSdk10) {
  Write-Host "Installing .NET 10 SDK with winget (accept the UAC prompt)..." -ForegroundColor Yellow
  winget install --id Microsoft.DotNet.SDK.10 --exact --silent --accept-package-agreements --accept-source-agreements | Out-Host
  $dotnet = "$env:ProgramFiles\dotnet\dotnet.exe"
  if (-not ((& $dotnet --list-sdks 2>$null) -match '^10\.')) { throw ".NET 10 SDK install did not complete" }
}
& $dotnet --list-sdks 2>$null | Out-Host
$proj = Join-Path $repo "plugin\Civil3dMcpPlugin\Civil3dMcpPlugin.csproj"
$out  = Join-Path $repo "plugin\Civil3dMcpPlugin\bin\Release\publish"
$env:DOTNET_NOLOGO = "1"
& $dotnet publish $proj -c Release -o $out 2>&1 | ForEach-Object { "$_" } | Out-Host
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed" }
$ErrorActionPreference = "Stop"
Write-Host "Plugin built: $out" -ForegroundColor Green

# ---- 4. Port ----------------------------------------------------------------------
# Cemengal: 8766 is the default of the plugin, the server and this script; 8080 is the Revit MCP's
# (docs/decisions/0002-own-port-8766.md). CIVIL3D_PORT is persisted only for another port, passed with -Port.
$DefaultPort = 8766
$owner = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($owner) {
  $proc = (Get-Process -Id $owner.OwningProcess -ErrorAction SilentlyContinue).ProcessName
  if ($proc -ne "acad") { throw "Port $Port is used by '$proc'. Re-run with a free port: setup_claude.ps1 -Port <port>" }
}
if ($Port -ne $DefaultPort) { [Environment]::SetEnvironmentVariable("CIVIL3D_PORT", "$Port", "User"); Write-Host "CIVIL3D_PORT = $Port (user environment variable)" }
else {
  $persisted = [Environment]::GetEnvironmentVariable("CIVIL3D_PORT", "User")
  if ($persisted) {
    # A value left by an earlier run would make the plugin listen there while Claude calls the default.
    [Environment]::SetEnvironmentVariable("CIVIL3D_PORT", $null, "User")
    Write-Host "Removed the persisted CIVIL3D_PORT=${persisted}: the default $DefaultPort applies" -ForegroundColor Yellow
  }
  Write-Host "Port $Port (the default; nothing persisted)"
}

# ---- 5. Autoload bundle --------------------------------------------------------
$bundle = Join-Path $env:APPDATA "Autodesk\ApplicationPlugins\CEM_Civil3DMCP.bundle"
$contents = Join-Path $bundle "Contents"
if (Test-Path $contents) {
  try { Remove-Item $contents -Recurse -Force } catch { Write-Host "Bundle files in use (Civil 3D open?) - copying over them" -ForegroundColor Yellow }
}
New-Item -ItemType Directory -Force $contents | Out-Null
Copy-Item (Join-Path $out "*") $contents -Recurse -Force -ErrorAction Continue
# Cemengal: the plugin needs CEM_CSharpExtended.dll beside it (CemTempFolder, docs/decisions/0003).
foreach ($dll in "Civil3dMcpPlugin.dll", "CEM_CSharpExtended.dll") {
  if (-not (Test-Path (Join-Path $contents $dll))) { throw "The bundle lacks $dll - is Civil 3D holding the old files? Close it and re-run." }
}
@"
<?xml version="1.0" encoding="utf-8"?>
<ApplicationPackage SchemaVersion="1.0" AppVersion="1.0.0" Name="CEM Civil3D MCP"
  Description="Executes C# from the Civil 3D MCP server" Author="Cemengal"
  ProductCode="{7C1E3A52-3B7E-4D0E-9C55-2D4E5C3D0A11}" UpgradeCode="{0B9A6F0C-8E4A-4F43-9E2B-6A1D5C3D0A12}">
  <CompanyDetails Name="Cemengal" />
  <Components>
    <RuntimeRequirements OS="Win64" Platform="Civil3D" SeriesMin="R25.0" />
    <ComponentEntry AppName="CEM_Civil3DMCP" ModuleName="./Contents/Civil3dMcpPlugin.dll"
      LoadOnAutoCADStartup="True" AppDescription="Civil 3D MCP listener">
    </ComponentEntry>
  </Components>
</ApplicationPackage>
"@ | Set-Content -Encoding UTF8 (Join-Path $bundle "PackageContents.xml")
Write-Host "Autoload bundle installed: $bundle" -ForegroundColor Green

# ---- 6. Register with Claude ------------------------------------------------------
$configs = @("$env:APPDATA\Claude\claude_desktop_config.json")
Get-ChildItem "$env:LOCALAPPDATA\Packages" -Directory -Filter "Claude*" -ErrorAction SilentlyContinue | ForEach-Object {
  $configs += Join-Path $_.FullName "LocalCache\Roaming\Claude\claude_desktop_config.json"
}
$existing = @($configs | Where-Object { Test-Path $_ })
if ($existing.Count -eq 0) { throw "No claude_desktop_config.json found" }
foreach ($cfg in $existing) {
  Copy-Item $cfg "$cfg.bak-civil3d" -Force
  $json = Get-Content $cfg -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $json.mcpServers) { $json | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{}) }
  $entry = [pscustomobject]@{ command = $node; args = @($indexJs) }
  if ($Port -ne $DefaultPort) { $entry | Add-Member -NotePropertyName env -NotePropertyValue ([pscustomobject]@{ CIVIL3D_PORT = "$Port" }) }
  $json.mcpServers | Add-Member -NotePropertyName "civil3d" -NotePropertyValue $entry -Force
  [IO.File]::WriteAllText($cfg, ($json | ConvertTo-Json -Depth 20), (New-Object Text.UTF8Encoding($false)))
  Write-Host "Registered civil3d in $cfg"
  Write-Host ("Servers now in config: " + (($json.mcpServers.PSObject.Properties | ForEach-Object Name) -join ", "))
}

Write-Host ""
Write-Host "Done. Restart Civil 3D (or NETLOAD $contents\Civil3dMcpPlugin.dll) and restart Claude." -ForegroundColor Green
}
catch { Write-Host "SETUP FAILED: $_" -ForegroundColor Red; $setupFailed = $true }
finally { if ($log) { Stop-Transcript | Out-Null } }
if ($setupFailed) { exit 1 }

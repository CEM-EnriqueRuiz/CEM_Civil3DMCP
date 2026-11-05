---
title: "Build and deploy: the server, the plugin, the bundle, and the Civil 3D restart"
type: workflow
updated: 2026-11-05
sources: [package.json, plugin/Civil3dMcpPlugin/Civil3dMcpPlugin.csproj, setup_claude.ps1]
related: [../decisions/0004-per-user-bundle-deploy.md, ../modules/harness-and-setup.md, test.md, live-mcp-test.md]
tags: [build, deploy, bundle, restart]
---

# Build and deploy

**Prerequisites.** Node 18+ (24 on the main machine), the .NET 10 SDK (`dotnet --list-sdks` shows `10.*`), the sibling
`..\..\CEM_CSharpExtended` cloned, and `C_References\*.dll` (copied from Civil 3D by `setup_claude.ps1` once).

```powershell
npm run build                                                                       # build/ (tsc; prebuild cleans)
dotnet build plugin\Civil3dMcpPlugin\Civil3dMcpPlugin.csproj -c Release -v minimal   # 0 errors (22 CA1416 warnings, known)
dotnet publish plugin\Civil3dMcpPlugin\Civil3dMcpPlugin.csproj -c Release -o plugin\Civil3dMcpPlugin\bin\Release\publish
```

The publish folder must contain `Civil3dMcpPlugin.dll` and `CEM_CSharpExtended.dll`.

**Deploy as a user:** `setup_claude.ps1` (or `.bat`) does everything, including the Claude config
([setup](../modules/harness-and-setup.md)).

**Deploy as an agent** (setup would change the user's Claude config and environment):
1. Ask the coordinator before closing or starting Civil 3D (the machine is shared; the AutoCAD agent may be using the
   same acad.exe through COM).
2. Through COM (`Windows PowerShell 5.1`: `[Runtime.InteropServices.Marshal]::GetActiveObject("AutoCAD.Application")`),
   read `DBMOD` of every open drawing. Civil 3D sets `DBMOD=1` right after opening a drawing, so 1 alone does not
   mean someone edited it. Never save a test drawing; keep a recovery copy under
   `%TEMP%\Cemengal\Civil3DMCP\Recovery` if the coordinator asks, then `Close($false)` and `Quit()` (retry on
   `RPC_E_CALL_REJECTED` while it is busy).
3. Copy `plugin\Civil3dMcpPlugin\bin\Release\publish\*` over
   `%APPDATA%\Autodesk\ApplicationPlugins\CEM_Civil3DMCP.bundle\Contents`.
4. Start Civil 3D with the same command line as before (Civil 3D 2027 on the main machine:
   `"D:\Archivos de programa\Autodesk\Autocad 2027\AutoCAD 2027\acad.exe" /ld "…\AecBase.dbx" /p "<<C3D_Imperial>>" /product C3D /language es-ES`),
   with `CIVIL3D_PORT` cleared in the launching shell: a process keeps the environment it started with.
5. Expect, in order: the unsigned-DLL prompt ("Cargar una vez" only with the coordinator's OK; "Cargar siempre" is
   the user's decision), a drawing-recovery notice after an unclean quit ("Cerrar"), then `ping` on 8766 answers
   with the new `pluginVersion`.
6. Open the test drawing read-only through COM: `Documents.Open(path, $true)`.

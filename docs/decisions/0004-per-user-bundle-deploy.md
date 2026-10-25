---
title: "0004 — The plugin deploys as the per-user ApplicationPlugins bundle CEM_Civil3DMCP.bundle"
type: decision
status: current
updated: 2026-10-24
sources: [setup_claude.ps1, README.md]
related: [../workflows/build-and-deploy.md, ../modules/harness-and-setup.md, ../../../../docs/workflows/add-a-sibling-repo.md]
tags: [deploy, bundle, autoload]
---

# 0004 — Per-user autoload bundle

**Context.** Upstream asked the user to `NETLOAD` the DLL. The Cemengal work (2026-10-18) made `setup_claude.ps1`
install it as an autoload bundle, the pattern of the workspace's host add-ins
([add a sibling repo](../../../../docs/workflows/add-a-sibling-repo.md), step 5).

**Decision.**
1. `%APPDATA%\Autodesk\ApplicationPlugins\CEM_Civil3DMCP.bundle`, with `PackageContents.xml`
   (`Platform="Civil3D"`, `SeriesMin="R25.0"`, `LoadOnAutoCADStartup="True"`) and `Contents\` = the plugin's
   `dotnet publish` output (`net10.0-windows`, Release), `CEM_CSharpExtended.dll` included.
2. Civil 3D is found through the registry (`HKLM:\SOFTWARE\Autodesk\AutoCAD\...\AcadLocation`), then the running
   acad.exe, then common install roots; on the main machine it is on `D:\Archivos de programa`.
3. The five reference DLLs are copied from that install into `C_References/` (ignored; never shipped).
4. The bundle is per user and local: never an ACC folder ([0003](0003-no-acc-writes-temp-folder.md)).

**Why.** The bundle loads on every start with no user step, and it is where Autodesk expects per-user plugins.

**Consequences.**
- The DLL is unsigned: Civil 3D asks "Seguridad - Archivo ejecutable no firmado" on every new build until the
  user chooses "Cargar siempre"; agents choose "Cargar una vez" only with the coordinator's OK.
- acad.exe locks the DLL: a rebuilt plugin needs Civil 3D closed before the copy and a restart after it.
- `setup_claude.ps1` also changes the Claude config and the user environment, so an agent deploys by copying the
  publish folder instead ([build and deploy](../workflows/build-and-deploy.md)).

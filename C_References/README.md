# C# References for Civil 3D Plugin

This directory holds copies of the following DLLs from your Civil 3D installation. The plugin compiles against them
and never ships them (`Private=False` in the csproj).

## Required DLLs

`setup_claude.ps1` finds Civil 3D through the registry (or the running acad.exe) and copies them here. On the main
machine that is Civil 3D 2027, e.g. `D:\Archivos de programa\Autodesk\Autocad 2027\AutoCAD 2027\`; the
`AeccDbMgd.dll` may sit in its `C3D\` subfolder.

| DLL | Purpose |
|-----|---------|
| `accoremgd.dll` | AutoCAD Core Managed |
| `AcDbMgd.dll` | AutoCAD Database Managed |
| `acmgd.dll` | AutoCAD Managed |
| `AecBaseMgd.dll` | AEC Base Managed |
| `AeccDbMgd.dll` | Civil 3D Database Managed |

## Instructions

1. Run `setup_claude.ps1` once (it also builds and deploys), or copy the DLLs above by hand from the Civil 3D
   install folder.
2. Build: `dotnet build plugin\Civil3dMcpPlugin\Civil3dMcpPlugin.csproj -c Release` from the repo root
   ([build and deploy](../docs/workflows/build-and-deploy.md)).

> **Note**: These DLLs are proprietary Autodesk files and must NOT be committed to version control.
> They are already excluded by `.gitignore`.

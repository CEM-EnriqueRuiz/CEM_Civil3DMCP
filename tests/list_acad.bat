@echo off
rem Lists the running acad.exe processes into %TEMP%\Cemengal\Civil3DMCP\TestResults\acad_procs.txt (tools/cem-temp.cjs:
rem never next to this script, pruned; docs/decisions/0003-no-acc-writes-temp-folder.md).
for /f "delims=" %%d in ('node "%~dp0..\tools\cem-temp.cjs" dir TestResults') do set "C3D_RESULTS=%%d"
if not defined C3D_RESULTS exit /b 1
tasklist /v /fi "imagename eq acad.exe" > "%C3D_RESULTS%\acad_procs.txt" 2>&1
wmic process where "name='acad.exe'" get ProcessId,CreationDate,CommandLine >> "%C3D_RESULTS%\acad_procs.txt" 2>&1
echo %C3D_RESULTS%\acad_procs.txt

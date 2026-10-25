@echo off
cd /d "%~dp0.."
"C:\Program Files\nodejs\node.exe" "%~dp0skills_test.cjs" --mark-verified
pause

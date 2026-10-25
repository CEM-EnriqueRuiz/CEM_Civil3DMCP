@echo off
title Civil3D MCP test runner
cd /d "%~dp0.."
"C:\Program Files\nodejs\node.exe" "%~dp0runner.cjs"
pause

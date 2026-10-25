@echo off
rem Ends only last night's scratch Civil 3D instance (PID 15724, Dibujo1.dwg, disconnected RDP session)
tasklist /fi "PID eq 15724" /v | find /i "Dibujo1" && taskkill /PID 15724 /F
timeout /t 3 >nul

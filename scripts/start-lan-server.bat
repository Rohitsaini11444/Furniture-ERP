@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-lan-server.ps1" %*
pause

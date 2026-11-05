@echo off
title Altin ve Doviz Portfoyum - Mobil Sunucu
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause

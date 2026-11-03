@echo off
rem Avanca a simulacao 1 dia. Dois cliques e pronto.
cd /d "%~dp0"
python simulacao\avancar.py %*
echo.
pause

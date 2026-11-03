@echo off
rem Liga o site no seu computador e abre o navegador.
cd /d "%~dp0"
echo Abrindo o site em http://localhost:8000
echo Pra desligar o site, feche esta janela.
start "" http://localhost:8000
python -m http.server 8000 --directory site

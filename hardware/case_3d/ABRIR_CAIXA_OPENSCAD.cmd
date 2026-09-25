@echo off
set "PASTA_CASE=%~dp0"
set "OPENSCAD_EXE=%PASTA_CASE%..\..\local_tools\OpenSCAD-portable\openscad-2021.01\openscad.exe"
set "ARQUIVO_CASE=%PASTA_CASE%escolta_case_v2.scad"

if not exist "%OPENSCAD_EXE%" (
    echo OpenSCAD nao encontrado em: "%OPENSCAD_EXE%"
    pause
    exit /b 1
)
if not exist "%ARQUIVO_CASE%" (
    echo Projeto da caixa nao encontrado em: "%ARQUIVO_CASE%"
    pause
    exit /b 1
)

start "" "%OPENSCAD_EXE%" "%ARQUIVO_CASE%"

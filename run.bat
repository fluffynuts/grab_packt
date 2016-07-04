@echo off
set START_DIR="%cd%"
cd %~dp0
REM npm install > nul
node.exe "%~dp0\server.js" >> "%~dp0\output.txt"
cd "%START_DIR%"
@echo on
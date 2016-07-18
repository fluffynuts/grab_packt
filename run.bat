@echo off
set START_DIR="%cd%"
cd %~dp0
node.exe "%~dp0\index.js"
cd "%START_DIR%"
@echo on

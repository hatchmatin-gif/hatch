@echo off
:: WURI Agent 실행기 - 이 파일을 더블클릭하거나 시작 프로그램에 등록
:: PowerShell 창을 최소화 상태로 숨겨서 백그라운드 실행
powershell.exe -WindowStyle Minimized -ExecutionPolicy Bypass -File "%~dp0wuri-agent.ps1"

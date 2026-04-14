@echo off
chcp 65001 > nul
echo WURI Agent 시작 중...
echo.

:: PowerShell 실행 정책 우회 + 현재 파일 위치 기준으로 ps1 실행
powershell.exe -ExecutionPolicy Bypass -WindowStyle Normal -File "%~dp0wuri-agent.ps1"

echo.
echo 프로그램이 종료되었습니다. 에러를 확인하세요.
pause

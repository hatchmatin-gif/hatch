@echo off
chcp 65001 > nul
echo WURI Agent 시작 중...
echo.

:: 러스트 빌드 결과물이 있는지 확인 후 실행
if exist "%~dp0target\release\wuri-agent.exe" (
    "%~dp0target\release\wuri-agent.exe" > "%~dp0agent_log.txt" 2>&1
) else (
    if exist "%~dp0target\debug\wuri-agent.exe" (
        echo [경고] 릴리즈 빌드가 없습니다. 디버그 모드로 실행합니다.
        "%~dp0target\debug\wuri-agent.exe"
    ) else (
        echo [오류] wuri-agent.exe를 찾을 수 없습니다. 먼저 빌드를 진행해 주세요.
        pause
        exit /b 1
    )
)

echo.
echo 프로그램이 종료되었습니다. 에러 로그(agent_log.txt)를 확인하세요.
pause

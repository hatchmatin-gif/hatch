@echo off
chcp 65001 > nul
echo WURI Agent 빌드 중 (Release 모드)...
echo.

cd /d "%~dp0"
cargo build --release

if %ERRORLEVEL% equ 0 (
    echo.
    echo 빌드 성공! target\release\wuri-agent.exe 파일이 생성되었습니다.
) else (
    echo.
    echo 빌드 실패. 에러를 확인해 주세요.
)
pause

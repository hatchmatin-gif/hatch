@echo off
chcp 65001 > nul
echo 코드 전송 및 자동 배포를 시작합니다.
echo.

git add .
git commit -m "index.html 메인 화면 수정"
git push

echo.
echo 깃허브 전송이 완료되었습니다. 
echo Vercel에서 곧 홈페이지를 업데이트합니다. 창을 닫으려면 아무 키나 누르십시오.
pause > nul
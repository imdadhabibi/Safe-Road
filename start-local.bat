@echo off
setlocal
cd /d "%~dp0"
echo ===============================================
echo SafeRoad - Local Preview Server
echo ===============================================
where py >nul 2>nul
if %errorlevel%==0 (
  echo Website: http://localhost:5500
  py -m http.server 5500
  goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
  echo Website: http://localhost:5500
  python -m http.server 5500
  goto :end
)
echo Python tidak ditemukan.
echo Alternatif: install extension Live Server pada VS Code.
pause
:end
endlocal

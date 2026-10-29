@echo off
rem Kettle & Stone: who to call. Double-click to start. Keep the black window open while you use the page.
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m backend.server
  goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
  python -m backend.server
  goto :end
)
echo Python is not installed on this computer.
echo Open fallback\kettle-refill.html instead: it works in the browser without Python.
:end
pause

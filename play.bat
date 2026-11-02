@echo off
rem Double-click to playtest Double Shift: starts a local server and opens the game in your browser.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required: https://nodejs.org & pause & exit /b 1)
node scripts\serve.mjs --open
pause

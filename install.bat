@echo off
setlocal EnableDelayedExpansion

set "PROJECT_DIR=%~dp0"
set "INSTALL_DIR=%LOCALAPPDATA%\Programs\mark-dawn"
set "EXE=%INSTALL_DIR%\mark-dawn.exe"

echo.
echo  ===============================
echo   mark-dawn  ^|  installer
echo  ===============================
echo.

:: ── 1. Build ──────────────────────────────────────────────────────────────────
echo  [1/3]  Building release...
echo.

dotnet publish "%PROJECT_DIR%mark-dawn.csproj" ^
    -c Release ^
    -o "%INSTALL_DIR%" ^
    --nologo ^
    -v quiet


if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: Build failed. Fix errors above and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo         Build OK  --^>  %INSTALL_DIR%
echo.

:: ── 2. Register file association + Start Menu shortcut ────────────────────────
echo  [2/3]  Registering .md file association...

powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%scripts\register.ps1" -InstallDir "%INSTALL_DIR%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  WARNING: Registration failed. You can retry from inside the app:
    echo           File ^> Register .md Association
    echo.
)

:: ── 3. Start Menu shortcut ────────────────────────────────────────────────────
echo  [3/3]  Creating Start Menu shortcut...

powershell -NoProfile -Command ^
    "$s = (New-Object -COM WScript.Shell).CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\mark-dawn.lnk');" ^
    "$s.TargetPath  = '%EXE%';" ^
    "$s.Description = 'mark-dawn Markdown Editor';" ^
    "$s.Save()"

echo.
echo  ===============================
echo   Installation complete!
echo.
echo   Exe  :  %EXE%
echo   Open any .md file to launch mark-dawn.
echo  ===============================
echo.
:: Only pause if run by double-click (not from another terminal)
echo %CMDCMDLINE% | find /i "/c" >nul 2>&1 && pause || exit /b 0

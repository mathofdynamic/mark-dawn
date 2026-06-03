@echo off
setlocal

set "INSTALL_DIR=%LOCALAPPDATA%\Programs\mark-dawn"
set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\mark-dawn.lnk"

echo.
echo  mark-dawn  ^|  uninstaller
echo  ============================
echo.

set /p CONFIRM=Remove mark-dawn? (y/N):
if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo  Removing file association...
powershell -NoProfile -Command ^
    "Remove-Item -Path 'HKCU:\Software\Classes\MarkDawn.mdfile' -Recurse -Force -ErrorAction SilentlyContinue;" ^
    "Remove-Item -Path 'HKCU:\Software\Classes\.md'             -Recurse -Force -ErrorAction SilentlyContinue;" ^
    "Remove-Item -Path 'HKCU:\Software\Classes\.markdown'       -Recurse -Force -ErrorAction SilentlyContinue;"

echo  Removing Start Menu shortcut...
if exist "%SHORTCUT%" del /f /q "%SHORTCUT%"

echo  Removing program files...
if exist "%INSTALL_DIR%" rd /s /q "%INSTALL_DIR%"

echo.
echo  Done. mark-dawn has been removed.
echo.
pause

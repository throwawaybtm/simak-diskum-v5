@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   ESP32-C6 Servo Studio - Standalone EXE Build Script
echo ========================================================

:: Check for virtualenv python, otherwise py -3.13, otherwise python
if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
    set "PYINSTALLER_EXE=venv\Scripts\pyinstaller.exe"
) else (
    set "PYTHON_EXE=py -3.13"
    set "PYINSTALLER_EXE=py -3.13 -m PyInstaller"
)

echo Using Python: %PYTHON_EXE%

echo.
echo [1/3] Checking dependencies...
%PYTHON_EXE% -m pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install requirements.
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Cleaning previous build artifacts...
if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"

echo.
echo [3/3] Building standalone executable with PyInstaller...
%PYINSTALLER_EXE% --noconsole --onefile --collect-all customtkinter --name "ESP32C6_Servo_Studio" main.py
if %ERRORLEVEL% NEQ 0 (
    echo Error: PyInstaller build failed.
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo Build complete! Executable is at: dist\ESP32C6_Servo_Studio.exe
echo ========================================================
endlocal

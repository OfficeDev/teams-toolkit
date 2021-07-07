@ECHO off
SETLOCAL

CALL :find_dp0
set "_prog=%dp0%..\node_modules\.bin\git-cz.cmd"
IF NOT EXIST "%_prog%" (
    ECHO "%_prog% does not exist, please install commitizen"
    ENDLOCAL
    EXIT /b 1
)

call "%_prog%" %*

ENDLOCAL
EXIT %errorlevel%

:find_dp0
SET dp0=%~dp0
EXIT /b
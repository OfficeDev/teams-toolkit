@ECHO off
SETLOCAL

CALL :find_dp0
set "_prog=%dp0%exec-git-cz.cmd"
IF NOT EXIST "%_prog%" (
    ECHO "%_prog% does not exist"
    ENDLOCAL
    EXIT /b 1
)
start /wait call "%_prog%" --hook %*)

:find_dp0
SET dp0=%~dp0
EXIT /b
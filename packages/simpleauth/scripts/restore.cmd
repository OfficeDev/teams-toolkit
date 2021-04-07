setlocal

pushd "%~dp0"

cd ..
dotnet restore "TeamsFxSimpleAuth.sln"

if "%ERRORLEVEL%" neq "0" (
    exit /b %ERRORLEVEL%
)

popd
exit /B 0

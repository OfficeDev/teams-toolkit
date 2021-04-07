setlocal

pushd "%~dp0"

cd ..
dotnet build --configuration "Release" TeamsFxSimpleAuth.sln

if "%ERRORLEVEL%" neq "0" (
    exit /b %ERRORLEVEL%
)

popd
exit /B 0

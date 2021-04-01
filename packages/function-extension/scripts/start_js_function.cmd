ECHO OFF

SET current_dir=%cd%

SET script_root_dir=%~dp0
SET local_nuget_path=%script_root_dir%\..\tests\TestAssets\FunctionAppJS\localNuget
SET local_nuget_source_name="localNuget"
SET release_path=%script_root_dir%\..\src\bin\Release\

ECHO "## Copy built nuget package to local nuget source"
RMDIR /q /s %local_nuget_path%
MKDIR %local_nuget_path%
nuget sources remove -Name %local_nuget_source_name%
nuget sources add -Name %local_nuget_source_name% -Source %local_nuget_path%
dotnet nuget locals all --clear

CD %release_path%
for /R %release_path% %%G in (*.nupkg) do (
    echo %%~nG
    set nuget_package_name=%%~nG
    goto break
)
:break
copy %release_path%\%nuget_package_name%.nupkg %local_nuget_path%
dir %local_nuget_path%

set nuget_package_version=%nuget_package_name:~40%
echo "nuget package version: %nuget_package_version%"

ECHO "## Sync function extensions"
CD %script_root_dir%\..\tests\TestAssets\FunctionAppJS\
RMDIR /q /s obj
RMDIR /q /s bin
CALL npm install
CALL func extensions install --package Microsoft.Azure.WebJobs.Extensions.TeamsFx --version %nuget_package_version% --source %local_nuget_source_name%

ECHO "## Start function"
START cmd /c func host start --port 7071

CD %current_dir%

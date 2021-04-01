ECHO OFF

SET current_dir=%cd%
SET script_root_dir=%~dp0
SET local_nuget_path=%script_root_dir%\..\tests\TestAssets\FunctionAppJS\localNuget

CD %script_root_dir%\..\src\
RMDIR /q /s obj
RMDIR /q /s bin
dotnet build --configuration Release -p:Version=99.0.0

RMDIR /q /s %local_nuget_path%
MKDIR %local_nuget_path%

move %script_root_dir%\..\src\bin\Release\Microsoft.Azure.WebJobs.Extensions.TeamsFx.*.nupkg %local_nuget_path%

CD %current_dir%

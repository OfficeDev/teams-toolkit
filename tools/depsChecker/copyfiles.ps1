# run this file to copy to the function plugin if you changed deps checker in extension
Set-PSDebug -Trace 1

$ProjectRoot = git rev-parse --show-toplevel
$CheckerRoot = "$ProjectRoot/packages/vscode-extension/src/debug/depsChecker"
$FunctionRoot = "$ProjectRoot/packages/fx-core/src/plugins/resource/function"

Write-Host $ProjectRoot

Copy-Item "$CheckerRoot/checker.ts" -Destination "$FunctionRoot/utils/depsChecker"
Copy-Item "$CheckerRoot/errors.ts" -Destination "$FunctionRoot/utils/depsChecker"
Copy-Item "$CheckerRoot/common.ts" -Destination "$FunctionRoot/utils/depsChecker"
Copy-Item "$CheckerRoot/telemetry.ts" -Destination "$FunctionRoot/utils/depsChecker"
Copy-Item "$CheckerRoot/backendExtensionsInstall.ts" -Destination "$FunctionRoot/utils/depsChecker"
Copy-Item "$CheckerRoot/dotnetChecker.ts" -Destination "$FunctionRoot/utils/depsChecker"

Copy-Item "$CheckerRoot/resource/dotnet-install.ps1" -Destination "$ProjectRoot/packages/fx-core/resource/plugins/resource/function"
Copy-Item "$CheckerRoot/resource/dotnet-install.sh" -Destination "$ProjectRoot/packages/fx-core/resource/plugins/resource/function"

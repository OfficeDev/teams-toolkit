# run this file to copy to the function plugin if you changed deps checker in extension
Set-PSDebug -Trace 1

$ProjectRoot = git rev-parse --show-toplevel
$CheckerRoot = "$ProjectRoot/packages/vscode-extension/src/debug/depsChecker"
$FunctionRoot = "$ProjectRoot/packages/fx-core/src/plugins/resource/function/utils/depsChecker"
$FunctionResourceRoot = "$ProjectRoot/packages/fx-core/resource/plugins/resource/function"
$CLIRoot = "$ProjectRoot/packages/cli/src/cmds/preview/depsChecker"

Write-Host $ProjectRoot

# Copy to functions plugin
Copy-Item "$CheckerRoot/backendExtensionsInstall.ts" -Destination "$FunctionRoot"
Copy-Item "$CheckerRoot/checker.ts" -Destination "$FunctionRoot"
Copy-Item "$CheckerRoot/common.ts" -Destination "$FunctionRoot"
Copy-Item "$CheckerRoot/cpUtils.ts" -Destination "$FunctionRoot"
Copy-Item "$CheckerRoot/dotnetChecker.ts" -Destination "$FunctionRoot"
Copy-Item "$CheckerRoot/errors.ts" -Destination "$FunctionRoot"

New-Item -Path "$FunctionResourceRoot" -ItemType Directory -Force
Copy-Item "$CheckerRoot/resource/dotnet-install.ps1" -Destination "$FunctionResourceRoot"
Copy-Item "$CheckerRoot/resource/dotnet-install.sh" -Destination "$FunctionResourceRoot"

# Copy to CLI
Copy-Item "$CheckerRoot/azureNodeChecker.ts" -Destination "$CLIRoot"
Copy-Item "$CheckerRoot/backendExtensionsInstall.ts" -Destination "$CLIRoot"
Copy-Item "$CheckerRoot/checker.ts" -Destination "$CLIRoot"
Copy-Item "$CheckerRoot/common.ts" -Destination "$CLIRoot"
Copy-Item "$CheckerRoot/cpUtils.ts" -Destination "$CLIRoot"
Copy-Item "$CheckerRoot/dotnetChecker.ts" -Destination "$CLIRoot"
Copy-Item "$CheckerRoot/errors.ts" -Destination "$CLIRoot"
Copy-Item "$CheckerRoot/funcToolChecker.ts" -Destination "$CLIRoot"
Copy-Item "$CheckerRoot/nodeChecker.ts" -Destination "$CLIRoot"
Copy-Item "$CheckerRoot/spfxNodeChecker.ts" -Destination "$CLIRoot"

New-Item -Path "$CLIRoot/resource" -ItemType Directory -Force
Copy-Item "$CheckerRoot/resource/dotnet-install.ps1" -Destination "$CLIRoot/resource"
Copy-Item "$CheckerRoot/resource/dotnet-install.sh" -Destination "$CLIRoot/resource"

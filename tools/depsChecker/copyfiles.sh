#!/bin/bash
# run this file to copy to the function plugin if you changed deps checker in extension
set -xue

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
CHECKER_ROOT="${PROJECT_ROOT}/packages/vscode-extension/src/debug/depsChecker"
FUNCTION_ROOT="${PROJECT_ROOT}/packages/fx-core/src/plugins/resource/function/utils/depsChecker"
FUNCTION_RESOURCE_ROOT="${PROJECT_ROOT}/packages/fx-core/resource/plugins/resource/function"
CLI_ROOT="${PROJECT_ROOT}/packages/cli/src/cmds/preview/depsChecker"

cp \
  "${CHECKER_ROOT}/backendExtensionsInstall.ts" \
  "${CHECKER_ROOT}/checker.ts" \
  "${CHECKER_ROOT}/common.ts" \
  "${CHECKER_ROOT}/cpUtils.ts" \
  "${CHECKER_ROOT}/dotnetChecker.ts" \
  "${CHECKER_ROOT}/errors.ts" \
  "${FUNCTION_ROOT}"

mkdir -p "${FUNCTION_RESOURCE_ROOT}"
cp "${CHECKER_ROOT}/resource/dotnet-install.sh" \
  "${CHECKER_ROOT}/resource/dotnet-install.ps1" \
  "${FUNCTION_RESOURCE_ROOT}"

cp \
  "${CHECKER_ROOT}/azureNodeChecker.ts" \
  "${CHECKER_ROOT}/backendExtensionsInstall.ts" \
  "${CHECKER_ROOT}/checker.ts" \
  "${CHECKER_ROOT}/common.ts" \
  "${CHECKER_ROOT}/cpUtils.ts" \
  "${CHECKER_ROOT}/dotnetChecker.ts" \
  "${CHECKER_ROOT}/errors.ts" \
  "${CHECKER_ROOT}/funcToolChecker.ts" \
  "${CHECKER_ROOT}/nodeChecker.ts" \
  "${CHECKER_ROOT}/spfxNodeChecker.ts" \
  "${CLI_ROOT}"

mkdir -p "${CLI_ROOT}/resource"
cp "${CHECKER_ROOT}/resource/dotnet-install.sh" \
  "${CHECKER_ROOT}/resource/dotnet-install.ps1" \
  "${CLI_ROOT}/resource"

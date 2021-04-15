#!/bin/bash
# run this file to copy to the function plugin if you changed deps checker in extension
set -xue

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
CHECKER_ROOT="${PROJECT_ROOT}/packages/vscode-extension/src/debug/depsChecker"
FUNCTION_ROOT="$PROJECT_ROOT/packages/fx-core/src/plugins/resource/function"
cp "${CHECKER_ROOT}/checker.ts" "${CHECKER_ROOT}/errors.ts" "${CHECKER_ROOT}/common.ts" "${CHECKER_ROOT}/dotnetChecker.ts" "${FUNCTION_ROOT}/utils/depsChecker"
cp "${CHECKER_ROOT}/resource/dotnet-install.sh" "${CHECKER_ROOT}/resource/dotnet-install.ps1" "${PROJECT_ROOT}/packages/fx-core/resource/plugins/resource/function/"

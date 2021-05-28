// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";
import { logger } from "../adapters/testLogger";

export const testCsprojFileName = "extensions.csproj";
export const testOutputDirName = "bin";

export async function createDotnetNugetConfig(dotnetExecPath: string, dir: string): Promise<void> {
  await cpUtils.executeCommand(
    undefined,
    logger,
    { cwd: dir },
    dotnetExecPath,
    "new",
    "nugetConfig"
  );
}

export async function addDotnetNugetSource(
  dotnetExecPath: string,
  dir: string,
  name: string,
  nugetSource: string
) {
  await cpUtils.executeCommand(
    undefined,
    logger,
    { cwd: dir },
    dotnetExecPath,
    "nuget",
    "add",
    "source",
    "-n",
    name,
    nugetSource
  );
}

export async function listDotnetNugetSource(dotnetExecPath: string, dir: string): Promise<string> {
  return await cpUtils.executeCommand(
    undefined,
    logger,
    { cwd: dir },
    dotnetExecPath,
    "nuget",
    "list",
    "source"
  );
}

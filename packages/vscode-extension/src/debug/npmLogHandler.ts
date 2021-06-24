// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";

import { cpUtils } from "./depsChecker/cpUtils";

async function getNpmCachePath(): Promise<string | undefined> {
  try {
    const result = await cpUtils.executeCommand(undefined, undefined, undefined, "npm config get cache");
    return result.trim();
  } catch (error) {
    return undefined;
  }
}

async function getLatestNpmLogFile(npmLogPath: string): Promise<string | undefined> {
  const files = await fs.readdir(npmLogPath);
  if (files.length === 0) {
      return undefined;
  }
  const latestNpmLogFile = files.reduce((previous, current, index, array) => {
      return previous > current ? previous : current;
  });
  return path.join(npmLogPath, latestNpmLogFile);
}

export async function getNpmInstallErrorLog(cwd: string): Promise<Array<string> | undefined> {
  const npmCachePath = await getNpmCachePath();
  if (npmCachePath === undefined || !fs.pathExists(npmCachePath)) {
    return undefined;
  }
  const latestNpmLogFile = await getLatestNpmLogFile(path.join(npmCachePath, "_logs"));
  if (latestNpmLogFile === undefined) {
      return undefined;
  }
  const log = (await fs.readFile(latestNpmLogFile)).toString();
  const cwdPattern = /\d+ verbose cwd (.*)/;
  const cwdResult = log.match(cwdPattern);
  // TODO: handle case sensitive path
  if (!cwdResult || cwdResult[1].trim().toLowerCase() !== cwd.toLowerCase()) {
      return undefined;
  }
  const errorPattern = /\d+ error .*/g;
  const errorResults = log.match(errorPattern);
  if (!errorResults) {
      return undefined;
  }
  return errorResults.map((value, index, array) => {
      return value.trim();
  });
}

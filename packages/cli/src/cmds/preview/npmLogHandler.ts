// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";

import { cpUtils } from "./depsChecker/cpUtils";

export interface NpmInstallLogInfo {
  nodeVersion: string | undefined;
  npmVersion: string | undefined;
  cwd: string | undefined;
  exitCode: number | undefined;
  errorMessage: Array<string> | undefined;
}

async function getNpmCachePath(): Promise<string | undefined> {
  try {
    const result = await cpUtils.executeCommand(
      undefined,
      undefined,
      undefined,
      "npm config get cache"
    );
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

export async function getNpmInstallLogInfo(): Promise<NpmInstallLogInfo | undefined> {
  const npmCachePath = await getNpmCachePath();
  if (npmCachePath === undefined || !fs.pathExists(npmCachePath)) {
    return undefined;
  }
  const latestNpmLogFile = await getLatestNpmLogFile(path.join(npmCachePath, "_logs"));
  if (latestNpmLogFile === undefined) {
    return undefined;
  }
  const log = (await fs.readFile(latestNpmLogFile)).toString();

  const nodePattern = /\d+\s+verbose\s+node\s+(v.*)/;
  const nodeResult = log.match(nodePattern);
  const nodeVersion = nodeResult ? nodeResult[1].trim() : undefined;

  const npmPattern = /\d+\s+verbose\s+npm\s+(v.*)/;
  const npmResult = log.match(npmPattern);
  const npmVersion = npmResult ? npmResult[1].trim() : undefined;

  const cwdPattern = /\d+\s+verbose\s+cwd\s+(.*)/;
  const cwdResult = log.match(cwdPattern);
  const cwd = cwdResult ? cwdResult[1].trim() : undefined;

  const exitCodePattern = /\d+\s+verbose\s+exit\s+\[\s+(-?\d+),\s+.*]/;
  const exitCodeResult = log.match(exitCodePattern);
  const exitCode = exitCodeResult ? Number(exitCodeResult[1]) : undefined;

  const errorPattern = /\d+\s+error\s+.*/g;
  const errorResults = log.match(errorPattern);
  const errorMessage = errorResults
    ? errorResults.map((value, index, array) => {
        return value.trim();
      })
    : undefined;

  const npmInstallLogInfo: NpmInstallLogInfo = {
    nodeVersion,
    npmVersion,
    cwd,
    exitCode,
    errorMessage,
  };
  return npmInstallLogInfo;
}

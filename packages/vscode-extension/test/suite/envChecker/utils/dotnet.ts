// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { ConfigFolderName } from "fx-api";
import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";
import { logger } from "../adapters/testLogger";

const find = require("find-process");

export const dotnetConfigPath = path.join(os.homedir(), "." + ConfigFolderName, "dotnet.json");
export const dotnetPrivateInstallPath = path.join(
  os.homedir(),
  "." + ConfigFolderName,
  "bin",
  "dotnet"
);
export const dotnetCommand = "dotnet";
export const dotnetOldVersion = "2.1";
export const dotnetInstallVersion = "3.1";
export const dotnetSupportedVersions = ["3.1", "5.0"];

export async function getDotnetExecPathFromConfig(
  dotnetConfigPath: string
): Promise<string | null> {
  try {
    const config = await fs.readJson(dotnetConfigPath, { encoding: "utf-8" });
    if (typeof config.dotnetExecutablePath === "string") {
      return config.dotnetExecutablePath;
    }
  } catch (error) {
    console.debug(`Failed to getDotnetConfig, error = '${error}'`);
  }
  return null;
}

export async function hasDotnetVersion(
  dotnetExecPath: string,
  versionString: string
): Promise<boolean> {
  return await hasAnyDotnetVersions(dotnetExecPath, [versionString]);
}

export async function hasAnyDotnetVersions(
  dotnetExecPath: string,
  versionStrings: string[]
): Promise<boolean> {
  try {
    const output = await cpUtils.executeCommand(
      undefined,
      logger,
      undefined,
      dotnetExecPath,
      "--list-sdks"
    );
    return output.split(/\r?\n/).some((line: string) => {
      return versionStrings.some((versionString) => line.startsWith(versionString));
    });
  } catch (error) {
    console.debug(`Failed to run "${dotnetExecPath} --list-sdks", error = '${error}'`);
    return false;
  }
}

export async function cleanup() {
  // fs-extra.remove() does nothing if the file does not exist.
  await fs.remove(dotnetConfigPath);
  const processes = await find("name", "dotnet", true);
  processes.forEach((p: { pid: number }, index: number, array: any) =>
    process.kill(p.pid, "SIGKILL")
  );
  await fs.remove(dotnetPrivateInstallPath);
}

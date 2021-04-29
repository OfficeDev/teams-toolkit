// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import * as tmp from "tmp";

import { ConfigFolderName } from "fx-api";
import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";
import { logger } from "../adapters/testLogger";
import { DotnetChecker, DotnetVersion } from "../../../../src/debug/depsChecker/dotnetChecker";

const find = require("find-process");

tmp.setGracefulCleanup();

export const dotnetConfigPath = path.join(os.homedir(), "." + ConfigFolderName, "dotnet.json");
export const dotnetPrivateInstallPath = path.join(
  os.homedir(),
  "." + ConfigFolderName,
  "bin",
  "dotnet"
);
export const dotnetCommand = "dotnet";
export const dotnetOldVersion = DotnetVersion.v21;
export const dotnetInstallVersion = DotnetVersion.v31;
export const dotnetSupportedVersions = [DotnetVersion.v31, DotnetVersion.v50];

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

export async function withDotnet(
  dotnetChecker: DotnetChecker,
  version: DotnetVersion,
  callback: (dotnetExecPath: string) => Promise<void>
): Promise<void> {
  const withDotnetAsync = async (installDir: string) => {
    // use private method as a helper method in test only
    await dotnetChecker["runDotnetInstallScript"](version, installDir);
    const dotnetExecPath = DotnetChecker["getDotnetExecPathFromDotnetInstallationDir"](installDir);
    await callback(dotnetExecPath);
  };

  return new Promise((resolve, reject) => {
    // unsafeCleanup: recursively removes the created temporary directory, even when it's not empty.
    tmp.dir({ unsafeCleanup: true }, function(err, path, cleanupCallback) {
      if (err) {
        reject(new Error(`Failed to create tmpdir, error = '${err}'`));
        return;
      }

      withDotnetAsync(path)
        .then(() => resolve())
        .catch((error) => reject(error))
        .finally(() => cleanupCallback());
    });
  });
}

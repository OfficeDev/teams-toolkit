// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { FuncToolChecker } from "../../../../src/component/deps-checker/internal/funcToolChecker";
import { cpUtils } from "../../../../src/component/deps-checker/util/cpUtils";

class TestFuncToolChecker extends FuncToolChecker {
  public static getDefaultInstallPath() {
    return super.getDefaultInstallPath();
  }
  public async queryGlobalFuncVersion(): Promise<string | undefined> {
    try {
      return (await super.queryFuncVersion(undefined)).versionStr;
    } catch {
      return undefined;
    }
  }
}

export async function cleanup(): Promise<void> {
  await fs.remove(TestFuncToolChecker.getDefaultInstallPath());
}

export async function getGlobalFunc(): Promise<string | undefined> {
  const funcChecker = new TestFuncToolChecker();
  return await funcChecker.queryGlobalFuncVersion();
}

export async function funcStart(binFolders?: string): Promise<cpUtils.ICommandResult> {
  return cpUtils.tryExecuteCommand(
    undefined,
    undefined,
    {
      shell: os.type() === "Windows_NT" ? "cmd.exe" : true,
      env: binFolders ? { PATH: `${binFolders}${path.delimiter}${process.env.PATH}` } : undefined,
    },
    "func",
    "start"
  );
}

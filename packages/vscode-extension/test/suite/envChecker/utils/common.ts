import * as chai from "chai";
import * as fs from "fs";

import { cpUtils } from "../../../../src/debug/depsChecker/cpUtils";
import { isWindows } from "../../../../src/debug/depsChecker/common";
import { logger } from "../adapters/testLogger";

export async function commandExistsInPath(command: string): Promise<boolean> {
  try {
    if (isWindows()) {
      await cpUtils.executeCommand(undefined, logger, { shell: "cmd.exe" }, "where", command);
    } else {
      await cpUtils.executeCommand(
        undefined,
        logger,
        { shell: "/bin/bash" },
        "type",
        "-P",
        command
      );
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function assertPathEqual(actual: string, expected: string) {
  chai.assert.equal(fs.realpathSync(actual), fs.realpathSync(expected));
}

export async function getExecutionPolicyForCurrentUser(): Promise<string> {
  const policy = await cpUtils.executeCommand(undefined, logger, undefined, "powershell.exe", "-Command", "Get-ExecutionPolicy", "-Scope", "CurrentUser");
  return policy.trim();
}

export async function setExecutionPolicyForCurrentUser(policy: string): Promise<void> {
  await cpUtils.executeCommand(undefined, logger, undefined, "powershell.exe", "-Command", "Set-ExecutionPolicy", "-Scope", "CurrentUser", policy);
}

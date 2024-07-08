// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as cp from "child_process";

/**
 * Run PowerShell command and return stdout content.
 * Note: the return value may contains EOL.
 */
export function execPowerShell(command: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      const psCommand = `powershell.exe -NoProfile -ExecutionPolicy unrestricted -Command "${command}"`;
      cp.exec(
        psCommand,
        { cwd: process.cwd(), maxBuffer: 500 * 1024, timeout: 100000, killSignal: "SIGKILL" },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Run shell command and return stdout content.
 * Note: the return value may contains EOL.
 */
export function execShell(command: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      cp.exec(
        command,
        { cwd: process.cwd(), maxBuffer: 500 * 1024, timeout: 100000, killSignal: "SIGKILL" },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

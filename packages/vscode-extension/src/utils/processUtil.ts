// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import kill from "tree-kill";

class ProcessUtil {
  // kill process and its child processes
  async killProcess(pid: number, timeout = 5000): Promise<void> {
    const tPromise = timeoutPromise(timeout);
    const killPromise = new Promise<void>((resolve, reject) => {
      kill(pid, "SIGTERM", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    await Promise.race([tPromise, killPromise]);
  }
}

export function timeoutPromise(timeout: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("Operation timeout"));
    }, timeout);
  });
}
export const processUtil = new ProcessUtil();

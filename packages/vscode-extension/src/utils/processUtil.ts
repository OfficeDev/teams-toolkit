// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import kill from "tree-kill";

class ProcessUtil {
  // kill process and its child processes
  async killProcess(pid: number): Promise<void> {
    return new Promise((resolve, reject) => {
      kill(pid, "SIGTERM", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
export const processUtil = new ProcessUtil();

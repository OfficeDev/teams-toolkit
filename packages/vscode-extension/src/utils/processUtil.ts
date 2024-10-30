// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { exec } from "child_process";

class ProcessUtil {
  async getProcessId(port: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const command =
        process.platform === "win32" ? `netstat -ano | findstr :${port}` : `lsof -i :${port}`;
      exec(command, (error, stdout) => {
        if (error) {
          return reject(error);
        }
        if (stdout) {
          if (process.platform === "win32") {
            const lines = stdout.split("\n");
            const pidLine = lines.find((line) => line.includes(`:${port}`));
            if (pidLine) {
              const pid = pidLine.trim().split(/\s+/).pop();
              resolve(pid || "");
            } else {
              resolve("");
            }
          } else {
            const pid = stdout.split("\n")[1]?.split(/\s+/)[1];
            resolve(pid || "");
          }
        } else {
          resolve("");
        }
      });
    });
  }

  async killProcess(pid: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = process.platform === "win32" ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`;
      exec(command, (error) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  }

  async getProcessInfo(pid: number): Promise<string> {
    if (process.platform === "win32") return await this.getProcessInfoWindows(pid);
    else return await this.getProcessCommandLineMac(pid);
  }

  async getProcessInfoWindows(pid: number): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(
        `wmic process where ProcessId=${pid} get CommandLine /value`,
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            const commandLine = stdout.split("=")[1]?.trim();
            resolve(commandLine || "No CommandLine found");
          }
        }
      );
    });
  }

  async getProcessCommandLineMac(pid: number): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(`ps -p ${pid} -o command=`, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }
}

export const processUtil = new ProcessUtil();

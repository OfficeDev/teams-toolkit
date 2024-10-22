// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { exec } from "child_process";
import detectPort from "detect-port";

class ProcessUtil {
  // 获取占用端口的进程ID (Linux/Mac)
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
            // Windows: 从 netstat 的输出中提取PID
            const lines = stdout.split("\n");
            const pidLine = lines.find((line) => line.includes(`:${port}`));
            if (pidLine) {
              const pid = pidLine.trim().split(/\s+/).pop();
              resolve(pid || "");
            } else {
              resolve("");
            }
          } else {
            // Linux/Mac: 从 lsof 输出中提取PID
            const pid = stdout.split("\n")[1]?.split(/\s+/)[1];
            resolve(pid || "");
          }
        } else {
          resolve("");
        }
      });
    });
  }

  // 杀死进程
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

  // 主逻辑：检查端口，获取进程ID并杀死进程
  async killProcessOnPort(port: number) {
    try {
      const port2 = await detectPort(port);
      if (port2 !== port) {
        console.log(`Port ${port} is occupied.`);
        const pid = await this.getProcessId(port);
        if (pid) {
          console.log(`Killing process with PID: ${pid}`);
          await this.killProcess(pid);
          console.log(`Process on port ${port} has been killed.`);
        } else {
          console.log(`No process found on port ${port}.`);
        }
      } else {
        console.log(`Port ${port} is not occupied.`);
      }
    } catch (error: any) {
      console.error(`Error: ${error.message as string}`);
    }
  }
}

export const processUtil = new ProcessUtil();

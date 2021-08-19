// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as dotenv from "dotenv";
import fs from "fs-extra";

export class EnvironmentUtils {
  static async writeEnvironments(
    envFile: string,
    variables: { [key: string]: string }
  ): Promise<void> {
    await fs.ensureFile(envFile);
    const envBuffer = await fs.readFile(envFile);

    // TODO: ut for the case
    const configs = dotenv.parse(envBuffer);
    const newConfigs = { ...configs, ...variables };
    if (JSON.stringify(newConfigs) === JSON.stringify(configs)) {
      // Avoid updating dotenv file's modified time.
      // We decide whether to skip deployment by comparing the mtime of all project files and last deployment time.
      return;
    }

    let envs = "";
    for (const key in configs) {
      envs += `${key}=${configs[key]}\r\n`;
    }
    await fs.writeFile(envFile, envs);
  }

  static async readEnvironments(envFile: string): Promise<{ [key: string]: string } | undefined> {
    if (await fs.pathExists(envFile)) {
      const envBuffer = await fs.readFile(envFile);
      const configs = dotenv.parse(envBuffer);
      return configs;
    }
    return undefined;
  }
}

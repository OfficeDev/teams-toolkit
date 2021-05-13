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

    const configs = dotenv.parse(envBuffer);
    Object.assign(configs, variables);

    let envs = "";
    for (const key in configs) {
      envs += `${key}=${configs[key]}\r\n`;
    }
    await fs.writeFile(envFile, envs);
  }
}

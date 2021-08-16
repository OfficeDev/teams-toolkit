// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as dotenv from "dotenv";
import fs from "fs-extra";
import { EnvironmentVariables } from "../constants";
import { AADEnvironment, FunctionEnvironment, RuntimeEnvironment } from "../ops/provision";

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

  static async updateEnvironment(
    envFilePath: string,
    runtimeEnv: RuntimeEnvironment,
    aadEnv: AADEnvironment,
    functionEnv?: FunctionEnvironment
  ): Promise<void> {
    let envs = await EnvironmentUtils.readEnvironments(envFilePath);

    if (!envs) {
      envs = {};
    }

    const addEnv = (key: string, v: string) => {
      if (v !== undefined && envs![key] === undefined) {
        envs![key] = v;
      }
    };

    if (functionEnv) {
      addEnv(EnvironmentVariables.FuncName, functionEnv.defaultName);
      addEnv(EnvironmentVariables.FuncEndpoint, functionEnv.endpoint);
    }

    addEnv(EnvironmentVariables.RuntimeEndpoint, runtimeEnv.endpoint);
    addEnv(EnvironmentVariables.StartLoginPage, runtimeEnv.startLoginPageUrl);
    addEnv(EnvironmentVariables.ClientID, aadEnv.clientId);

    await EnvironmentUtils.writeEnvironments(envFilePath, envs);
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

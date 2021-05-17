// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { EnvironmentUtils } from "../utils/environment-utils";
import { EnvironmentVariables } from "../constants";

export interface FunctionEnvironment {
  defaultName: string;
  endpoint: string;
}

export interface RuntimeEnvironment {
  endpoint: string;
  startLoginPageUrl: string;
}

export interface AADEnvironment {
  clientId: string;
}

export class FrontendProvision {
  public static async setEnvironments(
    envFilePath: string,
    functionEnv?: FunctionEnvironment,
    runtimeEnv?: RuntimeEnvironment,
    aadEnv?: AADEnvironment
  ): Promise<void> {
    const envs: { [key: string]: string } = {};
    if (functionEnv) {
      envs[EnvironmentVariables.FuncName] = functionEnv.defaultName;
      envs[EnvironmentVariables.FuncEndpoint] = functionEnv.endpoint;
    }

    if (runtimeEnv) {
      envs[EnvironmentVariables.RuntimeEndpoint] = runtimeEnv.endpoint;
      envs[EnvironmentVariables.StartLoginPage] = runtimeEnv.startLoginPageUrl;
    }

    if (aadEnv) {
      envs[EnvironmentVariables.ClientID] = aadEnv.clientId;
    }

    await EnvironmentUtils.writeEnvironments(envFilePath, envs);
  }
}

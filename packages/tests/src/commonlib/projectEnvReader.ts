// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { InputsWithProjectPath, Tools } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import { DotenvParseOutput } from "dotenv";

export class ProjectEnvReader {
  static async readEnvFile(
    workspace: string,
    env: string
  ): Promise<DotenvParseOutput | undefined> {
    const core = new FxCore({} as Tools);
    const res = await core.getDotEnvs({
      projectPath: workspace,
    } as InputsWithProjectPath);
    if (res.isOk()) {
      return res.value[env];
    }
    return undefined;
  }

  static async readAllEnvFiles(
    workspace: string
  ): Promise<DotenvParseOutput[]> {
    const core = new FxCore({} as Tools);
    const res = await core.getDotEnvs({
      projectPath: workspace,
    } as InputsWithProjectPath);
    if (res.isOk()) {
      const envs: DotenvParseOutput[] = [];
      const value = res.value;
      for (const key of Object.keys(value)) {
        const env = value[key];
        envs.push(env);
      }
      return envs;
    }
    return [];
  }
}

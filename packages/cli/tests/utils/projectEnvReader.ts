// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { InputsWithProjectPath, Tools } from "@microsoft/teamsfx-api";
import { environmentManager, FxCore } from "@microsoft/teamsfx-core";
import { DotenvParseOutput } from "dotenv";

export class ProjectEnvReader {
  static async readEnvFile(workspace: string, env = "dev"): Promise<DotenvParseOutput> {
    const core = new FxCore({} as Tools);
    const res = await core.getDotEnv({ projectPath: workspace, env: env } as InputsWithProjectPath);
    if (res.isOk()) return res.value ?? {};
    else return {};
  }

  static async readAllEnvFiles(workspace: string): Promise<DotenvParseOutput[]> {
    const res = await environmentManager.listAllEnvConfigs(workspace);
    if (res.isOk()) {
      const envs = res.value;
      const promises = envs.map(async (env) => {
        return await this.readEnvFile(workspace, env);
      });
      return await Promise.all(promises);
    }
    return [];
  }
}

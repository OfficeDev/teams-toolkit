// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import Ajv from "ajv";
import * as draft6MetaSchema from "ajv/dist/refs/json-schema-draft-06.json";
import fs from "fs-extra";
import { envUtil } from "../component/utils/envUtil";
import { FileNotFoundError, NoEnvFilesError } from "../error/common";
import { environmentNameManager } from "./environmentName";

class EnvironmentManager {
  private readonly ajv;

  constructor() {
    this.ajv = new Ajv();
    this.ajv.addMetaSchema(draft6MetaSchema);
  }
  public async listAllEnvConfigs(projectPath: string): Promise<Result<Array<string>, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(new FileNotFoundError("EnvironmentManager", projectPath));
    }
    const allEnvsRes = await envUtil.listEnv(projectPath);
    if (allEnvsRes.isErr()) return err(allEnvsRes.error);
    return ok(allEnvsRes.value);
  }

  public async listRemoteEnvConfigs(
    projectPath: string,
    returnErrorIfEmpty = false
  ): Promise<Result<Array<string>, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(new FileNotFoundError("EnvironmentManager", projectPath));
    }
    const allEnvsRes = await envUtil.listEnv(projectPath);
    if (allEnvsRes.isErr()) return err(allEnvsRes.error);
    const remoteEnvs = allEnvsRes.value.filter((env) =>
      environmentNameManager.isRemoteEnvironment(env)
    );
    if (remoteEnvs.length === 0 && returnErrorIfEmpty)
      return err(new NoEnvFilesError("EnvironmentManager"));
    return ok(remoteEnvs);
  }

  private async hasTestToolEnv(projectPath: string): Promise<boolean> {
    if (!(await fs.pathExists(projectPath))) {
      return false;
    }
    const allEnvsRes = await envUtil.listEnv(projectPath);
    if (allEnvsRes.isErr()) return false;
    return allEnvsRes.value.includes(environmentNameManager.getTestToolEnvName());
  }

  public async getExistingNonRemoteEnvs(projectPath: string): Promise<string[]> {
    return [
      ...((await this.hasTestToolEnv(projectPath))
        ? [environmentNameManager.getTestToolEnvName()]
        : []),
      environmentNameManager.getLocalEnvName(),
    ];
  }
}

export const environmentManager = new EnvironmentManager();

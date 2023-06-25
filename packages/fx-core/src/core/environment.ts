// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import Ajv from "ajv";
import * as draft6MetaSchema from "ajv/dist/refs/json-schema-draft-06.json";
import fs from "fs-extra";
import { envUtil } from "../component/utils/envUtil";
import { FileNotFoundError, NoEnvFilesError } from "../error/common";

class EnvironmentManager {
  public readonly envNameRegex = /^[\w\d-_]+$/;
  public readonly envConfigNameRegex = /^config\.(?<envName>[\w\d-_]+)\.json$/i;
  public readonly envStateNameRegex = /^state\.(?<envName>[\w\d-_]+)\.json$/i;

  public readonly schema = "https://aka.ms/teamsfx-env-config-schema";
  public readonly envConfigDescription =
    `You can customize the TeamsFx config for different environments.` +
    ` Visit https://aka.ms/teamsfx-env-config to learn more about this.`;

  private readonly defaultEnvName = "dev";
  private readonly ajv;
  private readonly localEnvName = "local";

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
    const remoteEnvs = allEnvsRes.value.filter((env) => env !== this.getLocalEnvName());
    if (remoteEnvs.length === 0 && returnErrorIfEmpty)
      return err(new NoEnvFilesError("EnvironmentManager"));
    return ok(remoteEnvs);
  }

  public isEnvConfig(projectPath: string, filePath: string): boolean {
    return false;
  }

  public getDefaultEnvName() {
    return this.defaultEnvName;
  }

  public getLocalEnvName() {
    return this.localEnvName;
  }
}

export const environmentManager = new EnvironmentManager();

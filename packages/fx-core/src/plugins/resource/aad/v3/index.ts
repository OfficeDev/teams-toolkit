// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  Json,
  ok,
  ProjectSettings,
  Result,
  TokenProvider,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { Service } from "typedi";
import { SolutionError } from "../../../solution";
import { Plugins } from "../constants";

const permissionFile = "permissions.json";

export async function checkPermissionRequest(
  projectPath: string
): Promise<Result<string, FxError>> {
  const filePath = path.join(projectPath, permissionFile);
  if (!(await fs.pathExists(filePath))) {
    return err(
      new UserError(
        SolutionError.MissingPermissionsJson,
        `${filePath} is missing`,
        Plugins.pluginNameShort
      )
    );
  }
  return ok(filePath);
}

export async function getPermissionRequest(projectPath: string): Promise<Result<string, FxError>> {
  const checkRes = await checkPermissionRequest(projectPath);
  if (checkRes.isErr()) {
    return err(checkRes.error);
  }
  const permissionRequest = await fs.readJSON(checkRes.value);
  return ok(JSON.stringify(permissionRequest));
}

export function isAadAdded(projectSetting: ProjectSettings): boolean {
  return (
    projectSetting.solutionSettings as v3.TeamsFxSolutionSettings
  ).activeResourcePlugins.includes(Plugins.pluginNameComplex);
}

@Service(Plugins.pluginNameComplex)
export class AadAppForTeamsPluginV3 implements v3.ResourcePlugin {
  name = Plugins.pluginNameComplex;
  type: "resource" = "resource";
  resourceType = "Azure AD App";
  description = "Azure AD App";

  async addResource(
    ctx: v3.ContextWithManifest,
    inputs: v3.PluginAddResourceInputs
  ): Promise<Result<Void, FxError>> {
    throw new Error();
  }

  async provisionLocalResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<Json, FxError>> {
    const checkPermissionRes = await checkPermissionRequest(inputs.projectPath);
    if (checkPermissionRes.isErr()) return err(checkPermissionRes.error);
    throw new Error();
  }
  async configureLocalResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    throw new Error();
  }

  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<v3.CloudResource, FxError>> {
    const checkPermissionRes = await checkPermissionRequest(inputs.projectPath);
    if (checkPermissionRes.isErr()) return err(checkPermissionRes.error);

    throw new Error();
  }
  async configureResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    throw new Error();
  }
}

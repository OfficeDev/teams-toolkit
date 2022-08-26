// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Bicep,
  CloudResource,
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  ResourceContextV3,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { AadAppOutputs, ComponentNames } from "../../constants";
import * as path from "path";
import fs from "fs-extra";
import { getTemplatesFolder } from "../../../folder";
import { AadAppForTeamsImpl } from "../../../plugins/resource/aad/plugin";
import { convertContext } from "./utils";
import { convertProjectSettingsV3ToV2 } from "../../migrate";
import { generateAadManifestTemplate } from "../../../core/generateAadManifestTemplate";
import { createAuthFiles } from "../../../plugins/solution/fx-solution/v2/executeUserTask";
@Service(ComponentNames.AadApp)
export class AadApp implements CloudResource {
  readonly type = "cloud";
  readonly name = ComponentNames.AadApp;
  outputs = AadAppOutputs;
  finalOutputKeys = [
    "applicationIdUris",
    "clientId",
    "clientSecret",
    "objectId",
    "oauth2PermissionScopeId",
    "frontendEndpoint",
    "botId",
    "botEndpoint",
    "domain",
    "endpoint",
    "oauthAuthority",
    "oauthHost",
    "tenantId",
  ];
  secretFields = ["clientSecret"];
  async generateManifest(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const projectSetting = convertProjectSettingsV3ToV2(context.projectSetting);
    await generateAadManifestTemplate(inputs.projectPath, projectSetting);
    return ok(undefined);
  }
  async generateAuthFiles(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    needTab: boolean,
    needBot: boolean
  ): Promise<Result<undefined, FxError>> {
    const res = await createAuthFiles(inputs, context, needTab, needBot);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }
  async generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Bicep[], FxError>> {
    const bicep: Bicep = {
      type: "bicep",
      Parameters: await fs.readJson(
        path.join(getTemplatesFolder(), "bicep", "aadApp.parameters.json")
      ),
    };
    return ok([bicep]);
  }
  async provision(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    context.envInfo.state[ComponentNames.AadApp] ??= {};
    const aadAppImplement = new AadAppForTeamsImpl();
    const convertCtx = convertContext(context, inputs);
    await aadAppImplement.provisionUsingManifest(convertCtx);
    const convertState = convertCtx.envInfo.state.get("fx-resource-aad-app-for-teams");
    convertState.forEach((v: any, k: string) => {
      context.envInfo.state[ComponentNames.AadApp][k] = v;
    });
    return ok(undefined);
  }
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const aadAppImplement = new AadAppForTeamsImpl();
    const convertCtx = convertContext(context, inputs);
    await aadAppImplement.postProvisionUsingManifest(convertCtx);
    const convertState = convertCtx.envInfo.state.get("fx-resource-aad-app-for-teams");
    convertState.forEach((v: any, k: string) => {
      context.envInfo.state[ComponentNames.AadApp][k] = v;
    });
    return ok(undefined);
  }
  async setApplicationInContext(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const aadAppImplement = new AadAppForTeamsImpl();
    const convertCtx = convertContext(context, inputs);
    await aadAppImplement.setApplicationInContext(convertCtx);
    const convertState = convertCtx.envInfo.state.get("fx-resource-aad-app-for-teams");
    convertState.forEach((v: any, k: string) => {
      context.envInfo.state[ComponentNames.AadApp][k] = v;
    });
    return ok(undefined);
  }
  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const aadAppImplement = new AadAppForTeamsImpl();
    const convertCtx = convertContext(context, inputs);
    await aadAppImplement.deploy(convertCtx);
    const convertState = convertCtx.envInfo.state.get("fx-resource-aad-app-for-teams");
    convertState.forEach((v: any, k: string) => {
      context.envInfo.state[ComponentNames.AadApp][k] = v;
    });
    return ok(undefined);
  }
}

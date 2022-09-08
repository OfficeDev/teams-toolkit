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
  PluginContext,
  ResourceContextV3,
  Result,
  SystemError,
  UserError,
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
import { isVSProject } from "../../../common";
import { DialogUtils } from "../../../plugins/resource/aad/utils/dialog";
import { TelemetryUtils } from "../../../plugins/resource/aad/utils/telemetry";
import { Messages, Telemetry } from "../../../plugins/resource/aad/constants";
import { UnhandledError } from "../../../plugins/resource/aad/errors";
import { AadResult, ResultFactory } from "../../../plugins/resource/aad/results";
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
    const res = await createAuthFiles(
      inputs,
      context,
      needTab,
      needBot,
      isVSProject(context.projectSetting)
    );
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
    this.setState(convertCtx, context);
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
    const res = await this.runWithExceptionCatchingAsync(
      async () => aadAppImplement.setApplicationInContext(convertCtx),
      convertCtx,
      Messages.EndDeploy.telemetry
    );
    if (res.isErr()) {
      return res;
    }
    this.setState(convertCtx, context);
    return res;
  }

  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const aadAppImplement = new AadAppForTeamsImpl();
    const convertCtx = convertContext(context, inputs);
    const res = await this.runWithExceptionCatchingAsync(
      () => aadAppImplement.deploy(convertCtx),
      convertCtx,
      Messages.EndDeploy.telemetry
    );
    if (res.isErr()) {
      return res;
    }
    this.setState(convertCtx, context);
    return res;
  }

  private setState(convertCtx: PluginContext, context: ResourceContextV3) {
    const convertState = convertCtx.envInfo.state.get("fx-resource-aad-app-for-teams");
    convertState.forEach((v: any, k: string) => {
      context.envInfo.state[ComponentNames.AadApp][k] = v;
    });
  }

  private async runWithExceptionCatchingAsync(
    fn: () => Promise<AadResult>,
    ctx: PluginContext,
    stage: string
  ): Promise<AadResult> {
    try {
      return await fn();
    } catch (e) {
      return this.returnError(e, ctx, stage);
    }
  }

  private returnError(e: any, ctx: PluginContext, stage: string): AadResult {
    if (e instanceof SystemError || e instanceof UserError) {
      let errorMessage = e.message;
      // For errors contains innerError, e.g. failures when calling Graph API
      if (e.innerError) {
        errorMessage += ` Detailed error: ${e.innerError.message}.`;
        if (e.innerError.response?.data?.errorMessage) {
          // For errors return from App Studio API
          errorMessage += ` Reason: ${e.innerError.response?.data?.errorMessage}`;
        } else if (e.innerError.response?.data?.error?.message) {
          // For errors return from Graph API
          errorMessage += ` Reason: ${e.innerError.response?.data?.error?.message}`;
        }
        e.message = errorMessage;
      }
      ctx.logProvider?.error(errorMessage);
      TelemetryUtils.sendErrorEvent(
        stage,
        e.name,
        e instanceof UserError ? Telemetry.userError : Telemetry.systemError,
        errorMessage
      );
      DialogUtils.progress?.end(false);
      return err(e);
    } else {
      if (!(e instanceof Error)) {
        e = new Error(e.toString());
      }

      ctx.logProvider?.error(e.message);
      TelemetryUtils.sendErrorEvent(
        stage,
        UnhandledError.name,
        Telemetry.systemError,
        UnhandledError.message() + " " + e.message
      );
      return err(
        ResultFactory.SystemError(
          UnhandledError.name,
          UnhandledError.message(),
          e,
          undefined,
          undefined
        )
      );
    }
  }
}

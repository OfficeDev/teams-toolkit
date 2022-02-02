// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  AzureSolutionSettings,
  err,
  FxError,
  InvalidInputError,
  Json,
  ok,
  ProjectSettings,
  Result,
  TeamsAppManifest,
  TokenProvider as TokenProviderInAPI,
  UserError,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { Service } from "typedi";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { DEFAULT_PERMISSION_REQUEST, SolutionError } from "../../../solution";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { AadAppClient } from "../aadAppClient";
import { Messages, Plugins, ProgressDetail, ProgressTitle, Telemetry } from "../constants";
import { AppIdUriInvalidError } from "../errors";
import { IAADDefinition } from "../interfaces/IAADDefinition";
import { AadAppForTeamsImpl } from "../plugin";
import { ResultFactory } from "../results";
import { Utils } from "../utils/common";
import {
  PostProvisionConfig,
  ProvisionConfig,
  SetApplicationInContextConfig,
} from "../utils/configs";
import { DialogUtils } from "../utils/dialog";
import { TokenProvider } from "../utils/tokenProvider";

const permissionFile = "permissions.json";

export async function createPermissionRequestFile(
  projectPath: string
): Promise<Result<string, FxError>> {
  const filePath = path.join(projectPath, permissionFile);
  await fs.writeJSON(filePath, DEFAULT_PERMISSION_REQUEST, {
    spaces: 4,
  });
  return ok(filePath);
}

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
  if (
    projectSetting.solutionSettings &&
    (projectSetting.solutionSettings as AzureSolutionSettings).activeResourcePlugins.includes(
      Plugins.pluginNameComplex
    )
  )
    return true;
  return false;
}

@Service(Plugins.pluginNameComplex)
export class AadAppForTeamsPluginV3 implements v3.FeaturePlugin {
  name = Plugins.pluginNameComplex;
  type: "resource" = "resource";
  resourceType = "Azure AD App";
  description = "Azure AD App provide single-sign-on feature for Teams App";

  /**
   * when AAD is added, permissions.json is created
   * manifest template will also be updated
   */
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate | undefined, FxError>> {
    const res = await createPermissionRequestFile(inputs.projectPath);
    if (res.isErr()) return err(res.error);
    const loadRes = await ctx.appManifestProvider.loadManifest(ctx, inputs);
    if (loadRes.isErr()) return err(loadRes.error);
    const manifest = loadRes.value;
    (manifest as TeamsAppManifest).webApplicationInfo = {
      id: `{{state.${Plugins.pluginNameComplex}.clientId}}`,
      resource: `{{{state.${Plugins.pluginNameComplex}.applicationIdUris}}}`,
    };
    await ctx.appManifestProvider.saveManifest(ctx, inputs, manifest);
    return ok(undefined);
  }

  @hooks([CommonErrorHandlerMW()])
  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProviderInAPI
  ): Promise<Result<Void, FxError>> {
    const checkPermissionRes = await checkPermissionRequest(inputs.projectPath);
    if (checkPermissionRes.isErr()) return err(checkPermissionRes.error);
    const isLocalDebug = envInfo.envName === "local";
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.StartProvision,
      Messages.StartLocalDebug,
      isLocalDebug
    );

    const telemetryMessage = isLocalDebug
      ? Messages.EndLocalDebug.telemetry
      : Messages.EndProvision.telemetry;

    await TokenProvider.init({
      graph: tokenProvider.graphTokenProvider,
      appStudio: tokenProvider.appStudioToken,
    });

    //init aad part in local settings or env state
    if (!envInfo.state[BuiltInFeaturePluginNames.aad]) {
      envInfo.state[BuiltInFeaturePluginNames.aad] = {
        secretFields: ["clientSecret"],
      };
    }
    // Move objectId etc. from input to output.
    const skip = Utils.skipCreateAadForProvision(envInfo);
    DialogUtils.init(ctx.userInteraction, ProgressTitle.Provision, ProgressTitle.ProvisionSteps);

    let config: ProvisionConfig = new ProvisionConfig(isLocalDebug);
    await config.restoreConfigFromEnvInfo(ctx, inputs, envInfo);
    const permissions = AadAppForTeamsImpl.parsePermission(
      config.permissionRequest as string,
      ctx.logProvider
    );

    await DialogUtils.progress?.start(ProgressDetail.Starting);
    if (config.objectId) {
      if (!skip) {
        await DialogUtils.progress?.next(ProgressDetail.GetAadApp);
        config = await AadAppClient.getAadApp(
          telemetryMessage,
          config.objectId,
          config.password,
          tokenProvider.graphTokenProvider,
          envInfo.envName
        );
        ctx.logProvider?.info(Messages.getLog(Messages.GetAadAppSuccess));
      }
    } else {
      await DialogUtils.progress?.next(ProgressDetail.ProvisionAadApp);
      await AadAppClient.createAadApp(telemetryMessage, config);
      config.password = undefined;
      ctx.logProvider?.info(Messages.getLog(Messages.CreateAadAppSuccess));
    }

    if (!config.password) {
      await DialogUtils.progress?.next(ProgressDetail.CreateAadAppSecret);
      await AadAppClient.createAadAppSecret(telemetryMessage, config);
      ctx.logProvider?.info(Messages.getLog(Messages.CreateAadAppPasswordSuccess));
    }

    await DialogUtils.progress?.next(ProgressDetail.UpdatePermission);
    await AadAppClient.updateAadAppPermission(
      telemetryMessage,
      config.objectId as string,
      permissions,
      skip
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdatePermissionSuccess));
    await DialogUtils.progress?.end(true);
    config.saveConfigIntoEnvInfo(envInfo, TokenProvider.tenantId as string);
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.EndProvision,
      Messages.EndLocalDebug,
      isLocalDebug,
      skip ? { [Telemetry.skip]: Telemetry.yes } : {}
    );
    return ok(Void);
  }

  @hooks([CommonErrorHandlerMW()])
  async configureResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    tokenProvider: TokenProviderInAPI
  ): Promise<Result<Void, FxError>> {
    const setApplicationInContextRes = await this.setApplicationInContext(ctx, envInfo);
    if (setApplicationInContextRes.isErr()) return err(setApplicationInContextRes.error);
    const isLocalDebug = envInfo.envName === "local";
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.StartPostProvision,
      Messages.StartPostLocalDebug,
      isLocalDebug
    );
    const skip = Utils.skipCreateAadForProvision(envInfo);
    DialogUtils.init(
      ctx.userInteraction,
      ProgressTitle.PostProvision,
      ProgressTitle.PostProvisionSteps
    );

    await TokenProvider.init({
      graph: tokenProvider.graphTokenProvider,
      appStudio: tokenProvider.appStudioToken,
    });
    const config: PostProvisionConfig = new PostProvisionConfig(isLocalDebug);
    config.restoreConfigFromEnvInfo(ctx, envInfo);

    await DialogUtils.progress?.start(ProgressDetail.Starting);
    await DialogUtils.progress?.next(ProgressDetail.UpdateRedirectUri);

    const redirectUris: IAADDefinition = AadAppForTeamsImpl.getRedirectUris(
      config.frontendEndpoint,
      config.botEndpoint,
      config.clientId!
    );
    await AadAppClient.updateAadAppRedirectUri(
      isLocalDebug ? Messages.EndPostLocalDebug.telemetry : Messages.EndPostProvision.telemetry,
      config.objectId as string,
      redirectUris,
      skip
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdateRedirectUriSuccess));

    await DialogUtils.progress?.next(ProgressDetail.UpdateAppIdUri);
    await AadAppClient.updateAadAppIdUri(
      isLocalDebug ? Messages.EndPostLocalDebug.telemetry : Messages.EndPostProvision.telemetry,
      config.objectId as string,
      config.applicationIdUri as string,
      skip
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdateAppIdUriSuccess));

    await DialogUtils.progress?.end(true);
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.EndPostProvision,
      Messages.EndPostLocalDebug,
      isLocalDebug,
      skip ? { [Telemetry.skip]: Telemetry.yes } : {}
    );
    return ok(Void);
  }

  public async setApplicationInContext(
    ctx: v2.Context,
    envInfo: v3.EnvInfoV3
  ): Promise<Result<Void, FxError>> {
    const isLocalDebug = envInfo.envName === "local";
    const config: SetApplicationInContextConfig = new SetApplicationInContextConfig(isLocalDebug);
    config.restoreConfigFromEnvInfo(ctx, envInfo);

    if (!config.frontendDomain && !config.botId) {
      throw ResultFactory.UserError(AppIdUriInvalidError.name, AppIdUriInvalidError.message());
    }

    let applicationIdUri = "api://";
    applicationIdUri += config.frontendDomain ? `${config.frontendDomain}/` : "";
    applicationIdUri += config.botId ? "botid-" + config.botId : config.clientId;
    config.applicationIdUri = applicationIdUri;

    ctx.logProvider?.info(Messages.getLog(Messages.SetAppIdUriSuccess));
    (envInfo.state[BuiltInFeaturePluginNames.aad] as v3.AADApp).applicationIdUris =
      config.applicationIdUri;
    return ok(Void);
  }
}

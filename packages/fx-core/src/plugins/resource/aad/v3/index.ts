// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
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
import { BuiltInResourcePluginNames } from "../../../solution/fx-solution/v3/constants";
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
  return (
    projectSetting.solutionSettings as v3.TeamsFxSolutionSettings
  ).activeResourcePlugins.includes(Plugins.pluginNameComplex);
}

@Service(Plugins.pluginNameComplex)
export class AadAppForTeamsPluginV3 implements v3.ResourcePlugin {
  name = Plugins.pluginNameComplex;
  type: "resource" = "resource";
  resourceType = "Azure AD App";
  description = "Azure AD App provide single-sign-on feature for Teams App";

  /**
   * when AAD is added, permissions.json is created
   * manifest template will also be updated
   */
  async addResource(
    ctx: v3.ContextWithManifest,
    inputs: v3.PluginAddResourceInputs
  ): Promise<Result<Void, FxError>> {
    const res = await createPermissionRequestFile(inputs.projectPath);
    if (res.isErr()) return err(res.error);
    (ctx.appManifest.local as TeamsAppManifest).webApplicationInfo = {
      id: "{{localSettings.auth.clientId}}",
      resource: "{{{localSettings.auth.applicationIdUris}}}",
    };
    (ctx.appManifest.remote as TeamsAppManifest).webApplicationInfo = {
      id: `{{state.${Plugins.pluginNameComplex}.clientId}}`,
      resource: `{{{state.${Plugins.pluginNameComplex}.applicationIdUris}}}`,
    };
    return ok(Void);
  }

  @hooks([CommonErrorHandlerMW()])
  async _provision(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    tokenProvider: TokenProviderInAPI,
    localSettings?: Json,
    envInfo?: v3.EnvInfoV3
  ): Promise<Result<any, FxError>> {
    if (!localSettings && !envInfo) {
      return err(
        new InvalidInputError(Plugins.pluginNameShort, "localSettings or envInfo", "missing")
      );
    }
    const checkPermissionRes = await checkPermissionRequest(inputs.projectPath);
    if (checkPermissionRes.isErr()) return err(checkPermissionRes.error);
    const isLocalDebug = localSettings ? true : false;
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

    const localSettingsV2 = localSettings as v2.LocalSettings | undefined;

    // Move objectId etc. from input to output.
    const skip = localSettingsV2
      ? Utils.skipCreateAadForLocalProvision(localSettingsV2)
      : Utils.skipCreateAadForProvision(envInfo!);
    DialogUtils.init(ctx.userInteraction, ProgressTitle.Provision, ProgressTitle.ProvisionSteps);

    let config: ProvisionConfig = new ProvisionConfig(isLocalDebug);
    if (localSettingsV2) {
      await config.restoreConfigFromLocalSettings(ctx, inputs, localSettingsV2);
    } else {
      await config.restoreConfigFromEnvInfo(ctx, inputs, envInfo!);
    }
    const permissions = AadAppForTeamsImpl.parsePermission(
      config.permissionRequest as string,
      ctx.logProvider
    );

    await DialogUtils.progress?.start(ProgressDetail.Starting);
    if (config.objectId) {
      if (!skip) {
        await DialogUtils.progress?.next(ProgressDetail.GetAadApp);
        config = await AadAppClient.getAadAppV3(
          telemetryMessage,
          config.objectId,
          config.password,
          tokenProvider.graphTokenProvider
        );
        ctx.logProvider?.info(Messages.getLog(Messages.GetAadAppSuccess));
      }
    } else {
      await DialogUtils.progress?.next(ProgressDetail.ProvisionAadApp);
      await AadAppClient.createAadAppV3(telemetryMessage, config);
      config.password = undefined;
      ctx.logProvider?.info(Messages.getLog(Messages.CreateAadAppSuccess));
    }

    if (!config.password) {
      await DialogUtils.progress?.next(ProgressDetail.CreateAadAppSecret);
      await AadAppClient.createAadAppSecretV3(telemetryMessage, config);
      ctx.logProvider?.info(Messages.getLog(Messages.CreateAadAppPasswordSuccess));
    }

    await DialogUtils.progress?.next(ProgressDetail.UpdatePermission);
    await AadAppClient.updateAadAppPermissionV3(
      telemetryMessage,
      config.objectId as string,
      permissions,
      skip
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdatePermissionSuccess));

    await DialogUtils.progress?.end(true);
    if (localSettingsV2) {
      config.saveConfigIntoLocalSettings(localSettingsV2, TokenProvider.tenantId as string);
    } else {
      config.saveConfigIntoEnvInfo(envInfo!, TokenProvider.tenantId as string);
    }
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.EndProvision,
      Messages.EndLocalDebug,
      isLocalDebug,
      skip ? { [Telemetry.skip]: Telemetry.yes } : {}
    );
    if (localSettingsV2) return ok(localSettingsV2);
    const aadConfig = envInfo!.state[BuiltInResourcePluginNames.aad] as v3.AADApp;
    return ok(aadConfig);
  }

  @hooks([CommonErrorHandlerMW()])
  async _postProvision(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    tokenProvider: TokenProviderInAPI,
    localSettings?: Json,
    envInfo?: v3.EnvInfoV3
  ): Promise<Result<Void, FxError>> {
    const isLocalDebug = localSettings ? true : false;
    if (!localSettings && !envInfo) {
      return err(
        new InvalidInputError(Plugins.pluginNameShort, "localSettings or envInfo", "missing")
      );
    }
    Utils.addLogAndTelemetryWithLocalDebug(
      ctx.logProvider,
      Messages.StartPostProvision,
      Messages.StartPostLocalDebug,
      isLocalDebug
    );
    const localSettingsV2 = localSettings as v2.LocalSettings | undefined;
    const skip = localSettingsV2
      ? Utils.skipCreateAadForLocalProvision(localSettingsV2)
      : Utils.skipCreateAadForProvision(envInfo!);
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
    localSettingsV2
      ? config.restoreConfigFromLocalSettings(ctx, inputs, localSettingsV2)
      : config.restoreConfigFromEnvInfo(ctx, inputs, envInfo!);

    await DialogUtils.progress?.start(ProgressDetail.Starting);
    await DialogUtils.progress?.next(ProgressDetail.UpdateRedirectUri);

    const redirectUris: IAADDefinition = AadAppForTeamsImpl.getRedirectUris(
      config.frontendEndpoint,
      config.botEndpoint,
      config.clientId!
    );
    await AadAppClient.updateAadAppRedirectUriV3(
      isLocalDebug ? Messages.EndPostLocalDebug.telemetry : Messages.EndPostProvision.telemetry,
      config.objectId as string,
      redirectUris,
      skip
    );
    ctx.logProvider?.info(Messages.getLog(Messages.UpdateRedirectUriSuccess));

    await DialogUtils.progress?.next(ProgressDetail.UpdateAppIdUri);
    await AadAppClient.updateAadAppIdUriV3(
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

  async provisionLocalResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProviderInAPI
  ): Promise<Result<Json, FxError>> {
    return this._provision(ctx, inputs, tokenProvider, localSettings);
  }

  async configureLocalResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProviderInAPI
  ): Promise<Result<Void, FxError>> {
    const setApplicationInContextRes = await this.setApplicationInContext(ctx, localSettings);
    if (setApplicationInContextRes.isErr()) return err(setApplicationInContextRes.error);
    return this._postProvision(ctx, inputs, tokenProvider, localSettings);
  }

  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProviderInAPI
  ): Promise<Result<v3.CloudResource, FxError>> {
    return await this._provision(ctx, inputs, tokenProvider, undefined, envInfo as v3.EnvInfoV3);
  }
  async configureResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProviderInAPI
  ): Promise<Result<Void, FxError>> {
    const setApplicationInContextRes = await this.setApplicationInContext(
      ctx,
      undefined,
      envInfo as v3.EnvInfoV3
    );
    if (setApplicationInContextRes.isErr()) return err(setApplicationInContextRes.error);
    return await this._postProvision(
      ctx,
      inputs,
      tokenProvider,
      undefined,
      envInfo as v3.EnvInfoV3
    );
  }

  public async setApplicationInContext(
    ctx: v2.Context,
    localSettings?: Json,
    envInfo?: v3.EnvInfoV3
  ): Promise<Result<Void, FxError>> {
    if (!localSettings && !envInfo) {
      return err(
        new InvalidInputError(Plugins.pluginNameShort, "localSettings or envInfo", "missing")
      );
    }
    const isLocalDebug = localSettings ? true : false;
    const config: SetApplicationInContextConfig = new SetApplicationInContextConfig(isLocalDebug);
    isLocalDebug
      ? config.restoreConfigFromLocalSettings(localSettings as v2.LocalSettings)
      : config.restoreConfigFromEnvInfo(ctx, envInfo!);

    if (!config.frontendDomain && !config.botId) {
      throw ResultFactory.UserError(AppIdUriInvalidError.name, AppIdUriInvalidError.message());
    }

    let applicationIdUri = "api://";
    applicationIdUri += config.frontendDomain ? `${config.frontendDomain}/` : "";
    applicationIdUri += config.botId ? "botid-" + config.botId : config.clientId;
    config.applicationIdUri = applicationIdUri;

    ctx.logProvider?.info(Messages.getLog(Messages.SetAppIdUriSuccess));
    isLocalDebug
      ? ((localSettings as v2.LocalSettings).auth!.applicationIdUris = config.applicationIdUri)
      : ((envInfo!.state[BuiltInResourcePluginNames.aad] as v3.AADApp).applicationIdUris =
          config.applicationIdUri);
    return ok(Void);
  }
}

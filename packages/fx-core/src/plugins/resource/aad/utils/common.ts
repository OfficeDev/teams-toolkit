// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  EnvConfig,
  GraphTokenProvider,
  LogProvider,
  PluginContext,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { ConfigFilePath, ConfigKeys, Constants, Messages } from "../constants";
import { GetSkipAppConfigError } from "../errors";
import { IAADDefinition } from "../interfaces/IAADDefinition";
import { ResultFactory } from "../results";
import { ConfigUtils } from "./configs";
import { TelemetryUtils } from "./telemetry";

export class Utils {
  public static addLogAndTelemetryWithLocalDebug(
    logProvider: LogProvider | undefined,
    message: Messages,
    messageLocal: Messages,
    isLocalDebug = false,
    properties?: { [key: string]: string }
  ): void {
    if (!isLocalDebug) {
      logProvider?.info(message.log);
      TelemetryUtils.sendSuccessEvent(message.telemetry, properties);
    } else {
      logProvider?.info(messageLocal.log);
      TelemetryUtils.sendSuccessEvent(messageLocal.telemetry, properties);
    }
  }

  public static addLogAndTelemetry(logProvider: LogProvider | undefined, message: Messages): void {
    logProvider?.info(message.log);
    TelemetryUtils.sendSuccessEvent(message.telemetry);
  }

  public static addLocalDebugPrefix(isLocalDebug: boolean, key: string): string {
    return isLocalDebug ? Constants.localDebugPrefix + key : key;
  }

  public static getPermissionErrorMessage(
    message: string,
    isGrantPermission = false,
    objectId?: string
  ): string {
    return isGrantPermission
      ? `${Constants.permissions.name}: ${objectId}. Error: ${message}`
      : message;
  }

  public static getConfigFileName(envName?: string): string {
    if (!envName) {
      return ConfigFilePath.LocalSettings;
    } else {
      return ConfigFilePath.State(envName);
    }
  }

  public static getInputFileName(envName: string): string {
    return ConfigFilePath.Input(envName);
  }

  public static async getCurrentTenantId(graphTokenProvider?: GraphTokenProvider): Promise<string> {
    const tokenObject = await graphTokenProvider?.getJsonObject();
    const tenantId: string = (tokenObject as any)?.tid;
    return tenantId;
  }

  public static skipCreateAadForProvision(envInfo: v3.EnvInfoV3): boolean {
    const envConfig: EnvConfig = envInfo.config as EnvConfig;
    const envState: v3.AADApp = envInfo.state[BuiltInFeaturePluginNames.aad] as v3.AADApp;
    const objectId = envConfig.auth?.objectId;
    const clientId = envConfig.auth?.clientId;
    const clientSecret = envConfig.auth?.clientSecret;
    const oauth2PermissionScopeId = envConfig.auth?.accessAsUserScopeId;
    if (objectId && clientId && oauth2PermissionScopeId && clientSecret) {
      envState.objectId = objectId;
      envState.clientId = clientId;
      envState.clientSecret = clientSecret;
      envState.oauth2PermissionScopeId = oauth2PermissionScopeId;
      return true;
    } else if (objectId || clientId || oauth2PermissionScopeId || clientSecret) {
      throw ResultFactory.UserError(
        GetSkipAppConfigError.name,
        GetSkipAppConfigError.message(Utils.getInputFileName(envInfo.envName))
      );
    } else {
      return false;
    }
  }
  public static skipCreateAadForLocalProvision(localSettings: v2.LocalSettings): boolean {
    const objectId = localSettings.auth?.objectId;
    const clientId = localSettings.auth?.clientId;
    const clientSecret = localSettings.auth?.clientSecret;
    const oauth2PermissionScopeId = localSettings.auth?.oauth2PermissionScopeId;
    if (objectId && clientId && oauth2PermissionScopeId && clientSecret) {
      return true;
    } else if (objectId || clientId || oauth2PermissionScopeId || clientSecret) {
      throw ResultFactory.UserError(
        GetSkipAppConfigError.name,
        GetSkipAppConfigError.message(ConfigFilePath.LocalSettings)
      );
    } else {
      return false;
    }
  }
  public static skipAADProvision(ctx: PluginContext, isLocalDebug = false): boolean {
    const objectId = isLocalDebug
      ? ConfigUtils.getAadConfig(ctx, ConfigKeys.objectId, true)
      : ctx.envInfo.config.auth?.objectId;
    const clientId = isLocalDebug
      ? ConfigUtils.getAadConfig(ctx, ConfigKeys.clientId, true)
      : ctx.envInfo.config.auth?.clientId;
    const oauth2PermissionScopeId = isLocalDebug
      ? ConfigUtils.getAadConfig(ctx, ConfigKeys.oauth2PermissionScopeId, true)
      : ctx.envInfo.config.auth?.accessAsUserScopeId;
    const clientSecret = isLocalDebug
      ? ConfigUtils.getAadConfig(ctx, ConfigKeys.clientSecret, true)
      : ctx.envInfo.config.auth?.clientSecret;

    if (objectId && clientId && oauth2PermissionScopeId && clientSecret) {
      if (!isLocalDebug) {
        ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.objectId, objectId as string);
        ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.clientId, clientId as string);
        ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.clientSecret, clientSecret as string);
        ConfigUtils.checkAndSaveConfig(
          ctx,
          ConfigKeys.oauth2PermissionScopeId,
          oauth2PermissionScopeId as string
        );
      }
      return true;
    } else if (objectId || clientId || oauth2PermissionScopeId || clientSecret) {
      throw ResultFactory.UserError(
        GetSkipAppConfigError.name,
        GetSkipAppConfigError.message(Utils.getInputFileName(ctx.envInfo.envName))
      );
    } else {
      return false;
    }
  }

  public static parseRedirectUriMessage(redirectUris: IAADDefinition): string {
    let message = "";
    if (redirectUris.web && redirectUris.web.redirectUris) {
      message += `Platform: Web, RedirectUri: ${redirectUris.web.redirectUris.join(",")}; `;
    }

    if (redirectUris.spa && redirectUris.spa.redirectUris) {
      message += `Platform: Single Page Application, RedirectUri: ${redirectUris.spa.redirectUris.join(
        ","
      )}; `;
    }

    return message;
  }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogProvider, PluginContext } from "@microsoft/teamsfx-api";
import { isMultiEnvEnabled } from "../../../..";
import { ConfigFilePath, ConfigKeys, Constants, Messages } from "../constants";
import { GetSkipAppConfigError } from "../errors";
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

  public static getConfigFileName(ctx: PluginContext, isLocalDebug: boolean): string {
    if (isMultiEnvEnabled()) {
      if (isLocalDebug) {
        return ConfigFilePath.LocalSettings;
      } else {
        return ConfigFilePath.State(ctx.envInfo.envName);
      }
    } else {
      return ConfigFilePath.Default;
    }
  }

  public static getInputFileName(ctx: PluginContext): string {
    return isMultiEnvEnabled() ? ConfigFilePath.Input(ctx.envInfo.envName) : ConfigFilePath.Default;
  }

  public static async getCurrentTenantId(ctx: PluginContext): Promise<string> {
    const tokenObject = await ctx.graphTokenProvider?.getJsonObject();
    const tenantId: string = (tokenObject as any).tid;
    return tenantId;
  }

  public static skipAADProvision(ctx: PluginContext, isLocalDebug = false): boolean {
    if (!isMultiEnvEnabled()) {
      const skip = ctx.config.get(ConfigKeys.skip) as boolean;
      return skip;
    }

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
        GetSkipAppConfigError.message(Utils.getInputFileName(ctx))
      );
    } else {
      return false;
    }
  }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogProvider, PluginContext } from "@microsoft/teamsfx-api";
import { isMultiEnvEnabled } from "../../../..";
import { ConfigFilePath, Constants, Messages } from "../constants";
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
        return ConfigFilePath.Profile(ctx.envInfo.envName);
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
}

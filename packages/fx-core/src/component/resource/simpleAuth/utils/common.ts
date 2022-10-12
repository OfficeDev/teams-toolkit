// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogProvider, PluginContext } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import { Constants, Message } from "../constants";
import {
  EndpointInvalidError,
  NoConfigError,
  VersionFileNotExist,
  ZipDownloadError,
} from "../errors";
import { ResultFactory } from "../result";
import { TelemetryUtils } from "./telemetry";
import { getTemplatesFolder } from "../../../../folder";
import got from "got";
import os from "os";
import {
  LocalSettingsAuthKeys,
  LocalSettingsFrontendKeys,
} from "../../../../common/localSettingsConstants";
import { getAllowedAppIds } from "../../../../common/tools";
export class Utils {
  public static generateResourceName(appName: string, resourceNameSuffix: string): string {
    const paddingLength =
      Constants.ResourceNameMaxLength -
      resourceNameSuffix.length -
      Constants.SimpleAuthSuffix.length;
    const normalizedAppName = appName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    return (
      normalizedAppName.substr(0, paddingLength) + Constants.SimpleAuthSuffix + resourceNameSuffix
    );
  }

  public static getSimpleAuthFilePath(): string {
    // const fxCoreDir: string = path.join(__dirname, "..", "..", "..", "..", "..");
    return path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "simpleauth",
      Constants.SimpleAuthFileName
    );
  }

  public static async downloadZip(filePath: string): Promise<void> {
    if (await Utils.checkFileExist(filePath)) {
      return;
    }

    const versionFilePath = path.join(filePath, "..", Constants.VersionFileName);
    if (!(await Utils.checkFileExist(versionFilePath))) {
      throw ResultFactory.SystemError(
        VersionFileNotExist.name,
        VersionFileNotExist.message(versionFilePath)
      );
    }

    const versionFile = await fs.readFile(versionFilePath, "utf-8");
    const version = versionFile.split(os.EOL)[0];
    const tag = Constants.SimpleAuthTag(version);
    const fileName = Constants.SimpleAuthZipName(version);
    const distUrl = Constants.SimpleAuthReleaseUrl(tag, fileName);

    try {
      await got.stream(distUrl).pipe(fs.createWriteStream(filePath));
    } catch (error) {
      throw ResultFactory.SystemError(
        ZipDownloadError.name,
        ZipDownloadError.message(error?.message),
        error
      );
    }

    if (!(await Utils.checkFileExist(filePath))) {
      throw ResultFactory.SystemError(ZipDownloadError.name, ZipDownloadError.message());
    }
  }

  public static getWebAppConfig(
    ctx: PluginContext,
    isLocalDebug: boolean
  ): { [propertyName: string]: string } {
    const clientId = this.getClientId(ctx, isLocalDebug);
    const clientSecret = this.getClientSecret(ctx, isLocalDebug);
    const oauthAuthority = this.getOauthAuthority(ctx, isLocalDebug);
    const applicationIdUris = this.getApplicationIdUris(ctx, isLocalDebug);

    const endpoint = this.getFrontendEndpoint(ctx, isLocalDebug);

    const allowedAppIds = getAllowedAppIds().join(";");
    const aadMetadataAddress = `${oauthAuthority}/v2.0/.well-known/openid-configuration`;
    let endpointUrl;
    try {
      endpointUrl = new URL(endpoint);
    } catch (error) {
      throw ResultFactory.SystemError(
        EndpointInvalidError.name,
        EndpointInvalidError.message(endpoint, error.message)
      );
    }
    const tabAppEndpoint = endpointUrl.origin;

    return {
      [Constants.ApplicationSettingsKeys.clientId]: clientId,
      [Constants.ApplicationSettingsKeys.clientSecret]: clientSecret,
      [Constants.ApplicationSettingsKeys.oauthAuthority]: oauthAuthority,
      [Constants.ApplicationSettingsKeys.applicationIdUris]: applicationIdUris,
      [Constants.ApplicationSettingsKeys.allowedAppIds]: allowedAppIds,
      [Constants.ApplicationSettingsKeys.tabAppEndpoint]: tabAppEndpoint,
      [Constants.ApplicationSettingsKeys.aadMetadataAddress]: aadMetadataAddress,
    };
  }

  public static addLocalDebugPrefix(isLocalDebug: boolean, key: string): string {
    return isLocalDebug ? Constants.LocalPrefix + key : key;
  }

  public static addLogAndTelemetry(
    logProvider: LogProvider | undefined,
    message: Message,
    properties?: { [key: string]: string }
  ): void {
    logProvider?.info(message.log);
    TelemetryUtils.sendEvent(message.telemetry, properties);
  }

  public static getConfigValueWithValidation(
    ctx: PluginContext,
    pluginId: string,
    configKey: string,
    isLocalDebug = false
  ): string {
    const key = Utils.addLocalDebugPrefix(isLocalDebug, configKey);
    const configValue = ctx.envInfo.state.get(pluginId)?.get(key);
    if (!configValue) {
      throw ResultFactory.SystemError(NoConfigError.name, NoConfigError.message(pluginId, key));
    }
    return configValue;
  }

  public static isUserError(error: any): boolean {
    if (
      error?.response?.status &&
      error?.response?.status >= Constants.statusCodeUserError &&
      error?.response?.status < Constants.statusCodeServerError
    ) {
      return true;
    } else {
      return false;
    }
  }

  private static getClientId(ctx: PluginContext, isLocalDebug: boolean): string {
    const clientId: string = isLocalDebug
      ? (ctx.localSettings?.auth?.get(LocalSettingsAuthKeys.ClientId) as string)
      : (Utils.getConfigValueWithValidation(
          ctx,
          Constants.AadAppPlugin.id,
          Constants.AadAppPlugin.configKeys.clientId,
          isLocalDebug
        ) as string);

    return clientId;
  }

  private static getClientSecret(ctx: PluginContext, isLocalDebug: boolean): string {
    const clientSecret: string = isLocalDebug
      ? (ctx.localSettings?.auth?.get(LocalSettingsAuthKeys.ClientSecret) as string)
      : (Utils.getConfigValueWithValidation(
          ctx,
          Constants.AadAppPlugin.id,
          Constants.AadAppPlugin.configKeys.clientSecret,
          isLocalDebug
        ) as string);

    return clientSecret;
  }

  private static getFrontendEndpoint(ctx: PluginContext, isLocalDebug: boolean): string {
    const tabEndpoint: string = isLocalDebug
      ? (ctx.localSettings?.frontend?.get(LocalSettingsFrontendKeys.TabEndpoint) as string)
      : (Utils.getConfigValueWithValidation(
          ctx,
          Constants.FrontendPlugin.id,
          Constants.FrontendPlugin.configKeys.endpoint
        ) as string);

    return tabEndpoint;
  }

  private static getOauthAuthority(ctx: PluginContext, isLocalDebug: boolean): string {
    const oauthAuthority: string = isLocalDebug
      ? (ctx.localSettings?.auth?.get(LocalSettingsAuthKeys.OauthAuthority) as string)
      : (Utils.getConfigValueWithValidation(
          ctx,
          Constants.AadAppPlugin.id,
          Constants.AadAppPlugin.configKeys.oauthAuthority
        ) as string);

    return oauthAuthority;
  }

  private static getApplicationIdUris(ctx: PluginContext, isLocalDebug: boolean): string {
    const applicationIdUris: string = isLocalDebug
      ? (ctx.localSettings?.auth?.get(LocalSettingsAuthKeys.ApplicationIdUris) as string)
      : (Utils.getConfigValueWithValidation(
          ctx,
          Constants.AadAppPlugin.id,
          Constants.AadAppPlugin.configKeys.applicationIdUris,
          isLocalDebug
        ) as string);

    return applicationIdUris;
  }

  private static async checkFileExist(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

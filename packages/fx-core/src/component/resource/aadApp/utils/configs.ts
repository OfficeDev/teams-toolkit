// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigValue,
  err,
  Result,
  FxError,
  ok,
  v3,
  EnvConfig,
  M365TokenProvider,
  LogProvider,
  PluginContext,
  v2,
} from "@microsoft/teamsfx-api";
import {
  Plugins,
  ConfigKeysOfOtherPlugin,
  ConfigFilePath,
  ConfigKeys,
  Constants,
  Messages,
} from "../constants";
import {
  ConfigErrorMessages as Errors,
  GetConfigError,
  MissingPermissionsRequestProvider,
  GetSkipAppConfigError,
} from "../errors";
import { format, Formats } from "./format";
import { v4 as uuidv4 } from "uuid";
import {
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
} from "../../../../common/localSettingsConstants";
import { IAADDefinition } from "../interfaces/IAADDefinition";
import { TelemetryUtils } from "./telemetry";
import { ResultFactory } from "../results";
import { getPermissionRequest } from "../permissions";
import { convertToAlphanumericOnly } from "../../../../common/utils";
import { ComponentNames } from "../../../../component/constants";
import { GraphScopes, isAadManifestEnabled } from "../../../../common/tools";

const aadComponentKey = ComponentNames.AadApp;
const tabComponentKey = ComponentNames.TeamsTab;
const botComponentKey = ComponentNames.TeamsBot;

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

  public static addLogAndTelemetry(
    logProvider: LogProvider | undefined,
    message: Messages,
    properties?: { [key: string]: string }
  ): void {
    logProvider?.info(message.log);
    TelemetryUtils.sendSuccessEvent(message.telemetry, properties);
  }

  public static addLocalDebugPrefix(isLocalDebug: boolean, key: string): string {
    return isLocalDebug ? Constants.localDebugPrefix + key : key;
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

  public static async getCurrentTenantId(m365TokenProvider?: M365TokenProvider): Promise<string> {
    const tokenObjectRes = await m365TokenProvider?.getJsonObject({ scopes: GraphScopes });
    const tokenObject = tokenObjectRes?.isOk() ? tokenObjectRes.value : undefined;
    const tenantId: string = (tokenObject as any)?.tid;
    return tenantId;
  }

  public static skipCreateAadForProvision(envInfo: v3.EnvInfoV3): boolean {
    const envConfig: EnvConfig = envInfo.config as EnvConfig;
    const envState: v3.AADApp = envInfo.state[aadComponentKey] as v3.AADApp;
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

    if (objectId && clientId && clientSecret) {
      if (!isLocalDebug) {
        ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.objectId, objectId as string);
        ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.clientId, clientId as string);
        ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.clientSecret, clientSecret as string);
        if (oauth2PermissionScopeId) {
          ConfigUtils.checkAndSaveConfig(
            ctx,
            ConfigKeys.oauth2PermissionScopeId,
            oauth2PermissionScopeId as string
          );
        }
      }
      return true;
    } else if (objectId || clientId || clientSecret) {
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

export class ConfigUtils {
  public static getAadConfig(
    ctx: PluginContext,
    key: string,
    isLocalDebug = false
  ): string | undefined {
    if (isLocalDebug) {
      return ctx.localSettings?.auth?.get(key) as string;
    } else {
      return ctx.envInfo.state.get(Plugins.pluginNameComplex)?.get(key) as string;
    }
  }

  public static getLocalDebugConfigOfOtherPlugins(
    ctx: PluginContext,
    key: string
  ): string | undefined {
    switch (key) {
      case ConfigKeysOfOtherPlugin.localDebugTabDomain:
        return ctx.localSettings?.frontend?.get(LocalSettingsFrontendKeys.TabDomain);
      case ConfigKeysOfOtherPlugin.localDebugTabEndpoint:
        return ctx.localSettings?.frontend?.get(LocalSettingsFrontendKeys.TabEndpoint);
      case ConfigKeysOfOtherPlugin.localDebugBotEndpoint:
        return ctx.localSettings?.bot?.get(LocalSettingsBotKeys.BotEndpoint);
      case ConfigKeysOfOtherPlugin.teamsBotIdLocal:
        return ctx.localSettings?.bot?.get(LocalSettingsBotKeys.BotId);
      default:
        return undefined;
    }
  }

  public static checkAndSaveConfig(
    ctx: PluginContext,
    key: string,
    value: ConfigValue,
    isLocalDebug = false
  ) {
    if (!value) {
      return;
    }

    if (isLocalDebug) {
      ctx.localSettings?.auth?.set(key, value);
    } else {
      ctx.envInfo.state.get(Plugins.pluginNameComplex)?.set(key, value);
    }
  }

  public static async getPermissionRequest(ctx: PluginContext): Promise<string> {
    if (ctx.permissionRequestProvider === undefined) {
      throw ResultFactory.SystemError(
        MissingPermissionsRequestProvider.name,
        MissingPermissionsRequestProvider.message()
      );
    }

    const permissionRequestResult = await ctx.permissionRequestProvider.getPermissionRequest();
    if (permissionRequestResult.isOk()) {
      return permissionRequestResult.value;
    } else {
      throw permissionRequestResult.error;
    }
  }
}

export class ProvisionConfig {
  public displayName?: string;
  public permissionRequest?: string;
  public clientId?: string;
  public password?: string;
  public objectId?: string;
  public oauth2PermissionScopeId?: string;
  private isLocalDebug: boolean;

  constructor(isLocalDebug = false, generateScopeId = true) {
    this.isLocalDebug = isLocalDebug;
    if (generateScopeId) {
      this.oauth2PermissionScopeId = uuidv4();
    }
  }
  public async restoreConfigFromLocalSettings(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    localSettings: v2.LocalSettings
  ): Promise<Result<any, FxError>> {
    this.setDisplayName(ctx.projectSetting.appName!);
    const permissionRes = await getPermissionRequest(inputs.projectPath);
    if (permissionRes.isErr()) {
      return err(permissionRes.error);
    }
    this.permissionRequest = permissionRes.value;
    const objectId = localSettings.auth?.objectId;
    if (objectId) {
      this.objectId = objectId as string;
    }
    const clientSecret = localSettings.auth?.clientSecret;
    if (clientSecret) {
      this.password = clientSecret as string;
    }
    return ok(undefined);
  }
  public async restoreConfigFromEnvInfo(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3
  ): Promise<Result<any, FxError>> {
    this.setDisplayName(ctx.projectSetting.appName!);
    const permissionRes = await getPermissionRequest(inputs.projectPath);
    if (permissionRes.isErr()) {
      return err(permissionRes.error);
    }
    this.permissionRequest = permissionRes.value;
    const aadResource = envInfo.state[aadComponentKey] as v3.AADApp;
    const objectId = aadResource?.objectId;
    if (objectId) {
      this.objectId = objectId as string;
    }
    const clientSecret = aadResource?.clientSecret;
    if (clientSecret) {
      this.password = clientSecret as string;
    }
    return ok(undefined);
  }
  public async restoreConfigFromContext(ctx: PluginContext): Promise<void> {
    this.setDisplayName(ctx.projectSettings!.appName!);

    if (!isAadManifestEnabled()) {
      this.permissionRequest = await ConfigUtils.getPermissionRequest(ctx);
    }

    const objectId: ConfigValue = ConfigUtils.getAadConfig(
      ctx,
      ConfigKeys.objectId,
      this.isLocalDebug
    );
    if (objectId) {
      this.objectId = objectId as string;
    }

    const clientSecret: ConfigValue = ConfigUtils.getAadConfig(
      ctx,
      ConfigKeys.clientSecret,
      this.isLocalDebug
    );
    if (clientSecret) {
      this.password = clientSecret as string;
    }
  }

  public saveConfigIntoContext(ctx: PluginContext, tenantId: string): void {
    const oauthAuthority = ProvisionConfig.getOauthAuthority(tenantId);

    ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.clientId, this.clientId, this.isLocalDebug);
    ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.clientSecret, this.password, this.isLocalDebug);
    ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.objectId, this.objectId, this.isLocalDebug);
    ConfigUtils.checkAndSaveConfig(
      ctx,
      ConfigKeys.oauth2PermissionScopeId,
      this.oauth2PermissionScopeId,
      this.isLocalDebug
    );
    ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.tenantId, tenantId, this.isLocalDebug);

    ConfigUtils.checkAndSaveConfig(
      ctx,
      ConfigKeys.oauthHost,
      Constants.oauthAuthorityPrefix,
      this.isLocalDebug
    );
    ConfigUtils.checkAndSaveConfig(
      ctx,
      ConfigKeys.oauthAuthority,
      oauthAuthority,
      this.isLocalDebug
    );
  }
  public saveConfigIntoLocalSettings(localSettings: v2.LocalSettings, tenantId: string): void {
    const oauthAuthority = ProvisionConfig.getOauthAuthority(tenantId);
    if (!localSettings.auth) {
      localSettings.auth = {};
    }
    if (localSettings.auth) {
      if (this.clientId) localSettings.auth.clientId = this.clientId;
      if (this.password) localSettings.auth.clientSecret = this.password;
      if (this.objectId) localSettings.auth.objectId = this.objectId;
      if (this.oauth2PermissionScopeId)
        localSettings.auth.oauth2PermissionScopeId = this.oauth2PermissionScopeId;
      localSettings.auth.tenantId = tenantId;
      localSettings.auth.oauthHost = Constants.oauthAuthorityPrefix;
      localSettings.auth.oauthAuthority = oauthAuthority;
    }
  }
  public saveConfigIntoEnvInfo(envInfo: v3.EnvInfoV3, tenantId: string): void {
    if (!envInfo.state[aadComponentKey]) {
      envInfo.state[aadComponentKey] = {};
      (envInfo.state[aadComponentKey] as v3.AADApp).secretFields = ["clientSecret"];
    }
    const envState = envInfo.state[aadComponentKey] as v3.AADApp;
    const oauthAuthority = ProvisionConfig.getOauthAuthority(tenantId);
    if (this.clientId) envState.clientId = this.clientId;
    if (this.password) envState.clientSecret = this.password;
    if (this.objectId) envState.objectId = this.objectId;
    if (this.oauth2PermissionScopeId)
      envState.oauth2PermissionScopeId = this.oauth2PermissionScopeId;
    envState.tenantId = tenantId;
    envState.oauthHost = Constants.oauthAuthorityPrefix;
    envState.oauthAuthority = oauthAuthority;
  }
  private static getOauthAuthority(tenantId: string): string {
    return `${Constants.oauthAuthorityPrefix}/${tenantId}`;
  }

  private setDisplayName(appName: string): void {
    const displayName: string = convertToAlphanumericOnly(appName);
    if (displayName) {
      this.displayName = displayName.substr(0, Constants.aadAppMaxLength) as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetDisplayNameError[0])
      );
    }
  }
}

export class SetApplicationInContextConfig {
  public frontendDomain?: string;
  public frontendEndpoint?: string;
  public botId?: string;
  public botEndpoint?: string;
  public clientId?: string;
  public applicationIdUri?: string;
  private isLocalDebug: boolean;

  constructor(isLocalDebug = false) {
    this.isLocalDebug = isLocalDebug;
  }

  public restoreConfigFromContext(ctx: PluginContext): void {
    let frontendDomain: ConfigValue;
    let frontendEndpoint: ConfigValue;
    if (this.isLocalDebug) {
      frontendDomain = ConfigUtils.getLocalDebugConfigOfOtherPlugins(
        ctx,
        ConfigKeysOfOtherPlugin.localDebugTabDomain
      );
    } else {
      frontendDomain = ctx.config.get(ConfigKeys.domain);
      if (!frontendDomain) {
        frontendDomain = ctx.envInfo.state
          .get(Plugins.frontendHosting)
          ?.get(ConfigKeysOfOtherPlugin.frontendHostingDomain);
        frontendEndpoint = ctx.envInfo.state
          .get(Plugins.frontendHosting)
          ?.get(ConfigKeysOfOtherPlugin.frontendHostingEndpoint);
      }
    }

    if (frontendEndpoint) {
      this.frontendEndpoint = format(frontendEndpoint as string, Formats.Endpoint);
    }
    if (frontendDomain) {
      this.frontendDomain = format(frontendDomain as string, Formats.Domain);
    }

    const botId: ConfigValue = this.isLocalDebug
      ? ConfigUtils.getLocalDebugConfigOfOtherPlugins(ctx, ConfigKeysOfOtherPlugin.teamsBotIdLocal)
      : ctx.envInfo.state.get(Plugins.teamsBot)?.get(ConfigKeysOfOtherPlugin.teamsBotId);
    if (botId) {
      this.botId = format(botId as string, Formats.UUID);
    }

    if (isAadManifestEnabled()) {
      const botEndpoint: ConfigValue = ctx.envInfo.state
        .get(Plugins.teamsBot)
        ?.get(ConfigKeysOfOtherPlugin.teamsBotEndpoint);
      if (botEndpoint) {
        this.botEndpoint = format(botEndpoint as string, Formats.Endpoint);
      }
    }

    const clientId: ConfigValue = ConfigUtils.getAadConfig(
      ctx,
      ConfigKeys.clientId,
      this.isLocalDebug
    );
    if (clientId) {
      this.clientId = clientId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName)[0])
      );
    }
  }
  public restoreConfigFromLocalSettings(localSettings: v2.LocalSettings): void {
    const frontendDomain = localSettings.frontend?.tabDomain;
    if (frontendDomain) {
      this.frontendDomain = format(frontendDomain as string, Formats.Domain);
    }
    const botId = localSettings.bot?.botId;
    if (botId) {
      this.botId = format(botId as string, Formats.UUID);
    }

    const clientId = localSettings.auth?.clientId;
    if (clientId) {
      this.clientId = clientId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName)[0])
      );
    }
  }
  public restoreConfigFromEnvInfo(ctx: v2.Context, envInfo: v3.EnvInfoV3): void {
    const aadResource = envInfo.state[aadComponentKey] as v3.AADApp;
    let frontendDomain = aadResource?.domain;
    if (!frontendDomain) {
      frontendDomain = (envInfo.state[tabComponentKey] as v3.FrontendHostingResource)?.domain;
    }
    if (frontendDomain) {
      this.frontendDomain = format(frontendDomain as string, Formats.Domain);
    }
    const botId = (envInfo.state[botComponentKey] as v3.AzureBot)?.botId;
    if (botId) {
      this.botId = format(botId as string, Formats.UUID);
    }
    const clientId: ConfigValue = aadResource?.clientId;
    if (clientId) {
      this.clientId = clientId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName)[0])
      );
    }
  }
  public saveConfigIntoContext(
    ctx: PluginContext,
    frontendDomain: string | undefined,
    botId: string | undefined,
    botEndpoint: string | undefined
  ): void {
    ConfigUtils.checkAndSaveConfig(
      ctx,
      ConfigKeys.applicationIdUri,
      this.applicationIdUri,
      this.isLocalDebug
    );

    if (isAadManifestEnabled()) {
      ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.botId, botId);
      ConfigUtils.checkAndSaveConfig(ctx, ConfigKeys.botEndpoint, botEndpoint);
      if (frontendDomain) {
        ConfigUtils.checkAndSaveConfig(
          ctx,
          ConfigKeys.frontendEndpoint,
          `https://${frontendDomain}`
        );
      }
    }
  }
}

export class PostProvisionConfig {
  public frontendEndpoint?: string;
  public botEndpoint?: string;
  public objectId?: string;
  public clientId?: string;
  public applicationIdUri?: string;
  private isLocalDebug: boolean;

  constructor(isLocalDebug = false) {
    this.isLocalDebug = isLocalDebug;
  }
  public restoreConfigFromLocalSettings(localSettings: v2.LocalSettings): void {
    const frontendEndpoint = localSettings.frontend?.tabEndpoint;
    if (frontendEndpoint) {
      this.frontendEndpoint = format(frontendEndpoint as string, Formats.Endpoint);
    }
    const botEndpoint = localSettings.bot?.botEndpoint;
    if (botEndpoint) {
      this.botEndpoint = format(botEndpoint as string, Formats.Endpoint);
    }
    const objectId = localSettings.auth?.objectId;
    if (objectId) {
      this.objectId = objectId as string;
    }
    if (objectId) {
      this.objectId = objectId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName)[0])
      );
    }
    const applicationIdUri = localSettings.auth?.applicationIdUris;
    if (applicationIdUri) {
      this.applicationIdUri = applicationIdUri as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(
          Errors.GetConfigError(ConfigKeys.applicationIdUri, Plugins.pluginName)[0]
        )
      );
    }
    const clientId = localSettings.auth?.clientId;
    if (objectId) {
      this.clientId = clientId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName)[0])
      );
    }
  }
  public restoreConfigFromEnvInfo(ctx: v2.Context, envInfo: v3.EnvInfoV3): void {
    const aadResource = envInfo.state[aadComponentKey] as v3.AADApp;
    let frontendEndpoint = aadResource?.endpoint;
    if (!frontendEndpoint) {
      frontendEndpoint = envInfo.state[tabComponentKey]?.endpoint;
    }
    if (frontendEndpoint) {
      this.frontendEndpoint = format(frontendEndpoint as string, Formats.Endpoint);
    }
    const botEndpoint = (envInfo.state[botComponentKey] as v3.AzureBot)?.siteEndpoint;
    if (botEndpoint) {
      this.botEndpoint = format(botEndpoint as string, Formats.Endpoint);
    }
    const objectId = aadResource?.objectId;
    if (objectId) {
      this.objectId = objectId as string;
    }
    if (objectId) {
      this.objectId = objectId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName)[0])
      );
    }
    const applicationIdUri = aadResource?.applicationIdUris;
    if (applicationIdUri) {
      this.applicationIdUri = applicationIdUri as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(
          Errors.GetConfigError(ConfigKeys.applicationIdUri, Plugins.pluginName)[0]
        )
      );
    }
    const clientId = aadResource?.clientId;
    if (clientId) {
      this.clientId = clientId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName)[0])
      );
    }
  }

  public async restoreConfigFromContext(ctx: PluginContext): Promise<void> {
    let frontendEndpoint: ConfigValue;
    if (this.isLocalDebug) {
      frontendEndpoint = ConfigUtils.getLocalDebugConfigOfOtherPlugins(
        ctx,
        ConfigKeysOfOtherPlugin.localDebugTabEndpoint
      );
    } else {
      frontendEndpoint = ctx.config.get(ConfigKeys.endpoint);
      if (!frontendEndpoint) {
        frontendEndpoint = ctx.envInfo.state
          .get(Plugins.frontendHosting)
          ?.get(ConfigKeysOfOtherPlugin.frontendHostingEndpoint);
      }
    }

    if (frontendEndpoint) {
      this.frontendEndpoint = format(frontendEndpoint as string, Formats.Endpoint);
    }

    const botEndpoint: ConfigValue = this.isLocalDebug
      ? ConfigUtils.getLocalDebugConfigOfOtherPlugins(
          ctx,
          ConfigKeysOfOtherPlugin.localDebugBotEndpoint
        )
      : ctx.envInfo.state.get(Plugins.teamsBot)?.get(ConfigKeysOfOtherPlugin.teamsBotEndpoint);
    if (botEndpoint) {
      this.botEndpoint = format(botEndpoint as string, Formats.Endpoint);
    }

    const objectId: ConfigValue = ConfigUtils.getAadConfig(
      ctx,
      ConfigKeys.objectId,
      this.isLocalDebug
    );
    if (objectId) {
      this.objectId = objectId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName)[0])
      );
    }

    const applicationIdUri: ConfigValue = ConfigUtils.getAadConfig(
      ctx,
      ConfigKeys.applicationIdUri,
      this.isLocalDebug
    );
    if (applicationIdUri) {
      this.applicationIdUri = applicationIdUri as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(
          Errors.GetConfigError(ConfigKeys.applicationIdUri, Plugins.pluginName)[0]
        )
      );
    }

    const clientId: ConfigValue = ConfigUtils.getAadConfig(
      ctx,
      ConfigKeys.clientId,
      this.isLocalDebug
    );
    if (clientId) {
      this.clientId = clientId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName)[0])
      );
    }
  }
}

export class UpdatePermissionConfig {
  public objectId?: string;
  public permissionRequest?: string;
  private isLocalDebug: boolean;

  constructor(isLocalDebug = false) {
    this.isLocalDebug = isLocalDebug;
  }

  public async restoreConfigFromContext(ctx: PluginContext): Promise<void> {
    const objectId: ConfigValue = ConfigUtils.getAadConfig(
      ctx,
      ConfigKeys.objectId,
      this.isLocalDebug
    );
    if (objectId) {
      this.objectId = objectId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName)[0])
      );
    }

    this.permissionRequest = await ConfigUtils.getPermissionRequest(ctx);
  }
}

export class CheckGrantPermissionConfig {
  public objectId?: string;
  public isGrantPermission: boolean;

  constructor(isGrantPermission = false) {
    this.isGrantPermission = isGrantPermission;
  }

  public async restoreConfigFromContext(ctx: PluginContext): Promise<void> {
    const objectId: ConfigValue = ctx.config?.get(ConfigKeys.objectId);
    if (objectId) {
      this.objectId = objectId as string;
    } else {
      const msg = getPermissionErrorMessage(
        Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName)[0],
        this.isGrantPermission
      );
      const msg1 = getPermissionErrorMessage(
        Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName)[1],
        this.isGrantPermission
      );
      throw ResultFactory.SystemError(GetConfigError.name, [msg, msg1]);
    }
  }
}

export function getPermissionErrorMessage(
  message: string,
  isGrantPermission = false,
  objectId?: string
): string {
  return isGrantPermission
    ? `${Constants.permissions.name}: ${objectId}. Error: ${message}`
    : message;
}

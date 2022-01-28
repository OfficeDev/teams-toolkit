// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  PluginContext,
  ConfigValue,
  Platform,
  Stage,
  v2,
  err,
  Result,
  FxError,
  ok,
  v3,
} from "@microsoft/teamsfx-api";
import { Constants, Plugins, ConfigKeysOfOtherPlugin, ConfigKeys } from "../constants";
import {
  ConfigErrorMessages as Errors,
  GetConfigError,
  MissingPermissionsRequestProvider,
} from "../errors";
import { format, Formats } from "./format";
import { Utils } from "./common";
import { ResultFactory } from "../results";
import { v4 as uuidv4 } from "uuid";
import {
  LocalSettingsBotKeys,
  LocalSettingsFrontendKeys,
} from "../../../../common/localSettingsConstants";
import { getPermissionRequest } from "../v3";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { BotOptionItem, TabOptionItem } from "../../../solution/fx-solution/question";

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

  constructor(isLocalDebug = false) {
    this.isLocalDebug = isLocalDebug;
    this.oauth2PermissionScopeId = uuidv4();
  }
  public async restoreConfigFromLocalSettings(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    localSettings: v2.LocalSettings
  ): Promise<Result<any, FxError>> {
    const displayName: string = ctx.projectSetting.appName;
    if (displayName) {
      this.displayName = displayName.substr(0, Constants.aadAppMaxLength) as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetDisplayNameError)
      );
    }
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
    const displayName: string = ctx.projectSetting.appName;
    if (displayName) {
      this.displayName = displayName.substr(0, Constants.aadAppMaxLength) as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetDisplayNameError)
      );
    }
    const permissionRes = await getPermissionRequest(inputs.projectPath);
    if (permissionRes.isErr()) {
      return err(permissionRes.error);
    }
    this.permissionRequest = permissionRes.value;
    const aadResource = envInfo.state[BuiltInFeaturePluginNames.aad] as v3.AADApp;
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
    const displayName: string = ctx.projectSettings!.appName;
    if (displayName) {
      this.displayName = displayName.substr(0, Constants.aadAppMaxLength) as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetDisplayNameError)
      );
    }

    this.permissionRequest = await ConfigUtils.getPermissionRequest(ctx);

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
    if (!envInfo.state[BuiltInFeaturePluginNames.aad]) {
      envInfo.state[BuiltInFeaturePluginNames.aad] = {};
      (envInfo.state[BuiltInFeaturePluginNames.aad] as v3.AADApp).secretFields = ["clientSecret"];
    }
    const envState = envInfo.state[BuiltInFeaturePluginNames.aad] as v3.AADApp;
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
}

export class SetApplicationInContextConfig {
  public frontendDomain?: string;
  public botId?: string;
  public clientId?: string;
  public applicationIdUri?: string;
  private isLocalDebug: boolean;

  constructor(isLocalDebug = false) {
    this.isLocalDebug = isLocalDebug;
  }

  public restoreConfigFromContext(ctx: PluginContext): void {
    let frontendDomain: ConfigValue;
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
      }
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
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName))
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
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName))
      );
    }
  }
  public restoreConfigFromEnvInfo(ctx: v2.Context, envInfo: v3.EnvInfoV3): void {
    const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
    const aadResource = envInfo.state[BuiltInFeaturePluginNames.aad] as v3.AADApp;
    let frontendDomain = aadResource?.domain;
    if (!frontendDomain) {
      const tabModules = solutionSettings.modules.filter((m) =>
        m.capabilities.includes(TabOptionItem.id)
      );
      if (tabModules.length > 0) {
        const hostingPlugin = tabModules[0].hostingPlugin;
        if (hostingPlugin) {
          frontendDomain = (envInfo.state[hostingPlugin] as v3.AzureStorage)?.domain;
        }
      }
    }

    if (frontendDomain) {
      this.frontendDomain = format(frontendDomain as string, Formats.Domain);
    }

    const botModules = solutionSettings.modules.filter((m) =>
      m.capabilities.includes(BotOptionItem.id)
    );
    let botId;
    if (botModules.length > 0) {
      const hostingPlugin = botModules[0].hostingPlugin;
      if (hostingPlugin) {
        botId = (envInfo.state[hostingPlugin] as v3.AzureBot)?.botId;
      }
    }
    if (botId) {
      this.botId = format(botId as string, Formats.UUID);
    }
    const clientId: ConfigValue = aadResource?.clientId;
    if (clientId) {
      this.clientId = clientId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName))
      );
    }
  }
  public saveConfigIntoContext(ctx: PluginContext): void {
    ConfigUtils.checkAndSaveConfig(
      ctx,
      ConfigKeys.applicationIdUri,
      this.applicationIdUri,
      this.isLocalDebug
    );
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
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName))
      );
    }
    const applicationIdUri = localSettings.auth?.applicationIdUris;
    if (applicationIdUri) {
      this.applicationIdUri = applicationIdUri as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(
          Errors.GetConfigError(ConfigKeys.applicationIdUri, Plugins.pluginName)
        )
      );
    }
    const clientId = localSettings.auth?.clientId;
    if (objectId) {
      this.clientId = clientId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName))
      );
    }
  }
  public restoreConfigFromEnvInfo(ctx: v2.Context, envInfo: v3.EnvInfoV3): void {
    const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
    const aadResource = envInfo.state[BuiltInFeaturePluginNames.aad] as v3.AADApp;
    let frontendEndpoint = aadResource?.endpoint;
    if (!frontendEndpoint) {
      const tabModules = solutionSettings.modules.filter((m) =>
        m.capabilities.includes(TabOptionItem.id)
      );
      if (tabModules.length > 0) {
        const hostingPlugin = tabModules[0].hostingPlugin;
        if (hostingPlugin) {
          frontendEndpoint = envInfo.state[hostingPlugin]?.endpoint;
        }
      }
    }

    if (frontendEndpoint) {
      this.frontendEndpoint = format(frontendEndpoint as string, Formats.Endpoint);
    }
    const botModules = solutionSettings.modules.filter((m) =>
      m.capabilities.includes(BotOptionItem.id)
    );
    let botEndpoint;
    if (botModules.length > 0) {
      const hostingPlugin = botModules[0].hostingPlugin;
      if (hostingPlugin) {
        botEndpoint = (envInfo.state[hostingPlugin] as v3.AzureBot)?.siteEndpoint;
      }
    }
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
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName))
      );
    }
    const applicationIdUri = aadResource?.applicationIdUris;
    if (applicationIdUri) {
      this.applicationIdUri = applicationIdUri as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(
          Errors.GetConfigError(ConfigKeys.applicationIdUri, Plugins.pluginName)
        )
      );
    }
    const clientId = aadResource?.clientId;
    if (clientId) {
      this.clientId = clientId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName))
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
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName))
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
          Errors.GetConfigError(ConfigKeys.applicationIdUri, Plugins.pluginName)
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
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.clientId, Plugins.pluginName))
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
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName))
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
      throw ResultFactory.SystemError(
        GetConfigError.name,
        Utils.getPermissionErrorMessage(
          GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName)),
          this.isGrantPermission
        )
      );
    }
  }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext, ConfigValue } from "@microsoft/teamsfx-api";
import { Constants, Plugins, ConfigKeysOfOtherPlugin, ConfigKeys } from "../constants";
import { ConfigErrorMessages as Errors, GetConfigError } from "../errors";
import { format, Formats } from "./format";
import { Utils } from "./common";
import { ResultFactory } from "../results";
import { v4 as uuidv4 } from "uuid";

function checkAndSaveConfig(context: PluginContext, key: string, value: ConfigValue) {
  if (!value) {
    return;
  }

  context.config.set(key, value);
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

    const permissionRequest: ConfigValue = ctx.configOfOtherPlugins
      .get(Plugins.solution)
      ?.get(ConfigKeysOfOtherPlugin.solutionPermissionRequest);
    if (permissionRequest) {
      this.permissionRequest = permissionRequest as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(
          Errors.GetConfigError(ConfigKeysOfOtherPlugin.solutionPermissionRequest, Plugins.solution)
        )
      );
    }

    const objectId: ConfigValue = ctx.config.get(
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.objectId)
    );
    if (objectId) {
      this.objectId = objectId as string;
    }

    const clientSecret: ConfigValue = ctx.config.get(
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.clientSecret)
    );
    if (clientSecret) {
      this.password = clientSecret as string;
    }
  }

  public saveConfigIntoContext(ctx: PluginContext, tenantId: string): void {
    const oauthAuthority = ProvisionConfig.getOauthAuthority(tenantId);

    checkAndSaveConfig(
      ctx,
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.clientId),
      this.clientId
    );
    checkAndSaveConfig(
      ctx,
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.clientSecret),
      this.password
    );
    checkAndSaveConfig(
      ctx,
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.objectId),
      this.objectId
    );
    checkAndSaveConfig(
      ctx,
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.oauth2PermissionScopeId),
      this.oauth2PermissionScopeId
    );
    checkAndSaveConfig(ctx, ConfigKeys.teamsMobileDesktopAppId, Constants.teamsMobileDesktopAppId);
    checkAndSaveConfig(
      ctx,
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.tenantId),
      tenantId
    );
    checkAndSaveConfig(ctx, ConfigKeys.oauthHost, Constants.oauthAuthorityPrefix);
    checkAndSaveConfig(ctx, ConfigKeys.teamsWebAppId, Constants.teamsWebAppId);
    checkAndSaveConfig(ctx, ConfigKeys.oauthAuthority, oauthAuthority);
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
    let frontendDomain: ConfigValue = ctx.config.get(ConfigKeys.domain);
    if (frontendDomain) {
      this.frontendDomain = format(frontendDomain as string, Formats.Domain);
    } else {
      frontendDomain = this.isLocalDebug
        ? ctx.configOfOtherPlugins
            .get(Plugins.localDebug)
            ?.get(ConfigKeysOfOtherPlugin.localDebugTabDomain)
        : ctx.configOfOtherPlugins
            .get(Plugins.frontendHosting)
            ?.get(ConfigKeysOfOtherPlugin.frontendHostingDomain);
      if (frontendDomain) {
        this.frontendDomain = format(frontendDomain as string, Formats.Domain);
      }
    }

    const botId: ConfigValue = this.isLocalDebug
      ? ctx.configOfOtherPlugins.get(Plugins.teamsBot)?.get(ConfigKeysOfOtherPlugin.teamsBotIdLocal)
      : ctx.configOfOtherPlugins.get(Plugins.teamsBot)?.get(ConfigKeysOfOtherPlugin.teamsBotId);
    if (botId) {
      this.botId = format(botId as string, Formats.UUID);
    }

    const clientId: ConfigValue = ctx.config.get(
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.clientId)
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

  public saveConfigIntoContext(ctx: PluginContext): void {
    checkAndSaveConfig(
      ctx,
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.applicationIdUri),
      this.applicationIdUri
    );
  }
}

export class PostProvisionConfig {
  public frontendEndpoint?: string;
  public botEndpoint?: string;
  public objectId?: string;
  public applicationIdUri?: string;
  private isLocalDebug: boolean;

  constructor(isLocalDebug = false) {
    this.isLocalDebug = isLocalDebug;
  }

  public async restoreConfigFromContext(ctx: PluginContext): Promise<void> {
    let frontendEndpoint: ConfigValue = ctx.config.get(ConfigKeys.endpoint);
    if (frontendEndpoint) {
      this.frontendEndpoint = format(frontendEndpoint as string, Formats.Endpoint);
    } else {
      frontendEndpoint = this.isLocalDebug
        ? ctx.configOfOtherPlugins
            .get(Plugins.localDebug)
            ?.get(ConfigKeysOfOtherPlugin.localDebugTabEndpoint)
        : ctx.configOfOtherPlugins
            .get(Plugins.frontendHosting)
            ?.get(ConfigKeysOfOtherPlugin.frontendHostingEndpoint);
      if (frontendEndpoint) {
        this.frontendEndpoint = format(frontendEndpoint as string, Formats.Endpoint);
      }
    }

    const botEndpoint: ConfigValue = this.isLocalDebug
      ? ctx.configOfOtherPlugins
          .get(Plugins.localDebug)
          ?.get(ConfigKeysOfOtherPlugin.localDebugBotEndpoint)
      : ctx.configOfOtherPlugins
          .get(Plugins.teamsBot)
          ?.get(ConfigKeysOfOtherPlugin.teamsBotEndpoint);
    if (botEndpoint) {
      this.botEndpoint = format(botEndpoint as string, Formats.Endpoint);
    }

    const objectId: ConfigValue = ctx.config.get(
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.objectId)
    );
    if (objectId) {
      this.objectId = objectId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName))
      );
    }

    const applicationIdUri: ConfigValue = ctx.config.get(
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.applicationIdUri)
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
    const objectId: ConfigValue = ctx.config.get(
      Utils.addLocalDebugPrefix(this.isLocalDebug, ConfigKeys.objectId)
    );
    if (objectId) {
      this.objectId = objectId as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(Errors.GetConfigError(ConfigKeys.objectId, Plugins.pluginName))
      );
    }

    const permissionRequest: ConfigValue = ctx.configOfOtherPlugins
      .get(Plugins.solution)
      ?.get(ConfigKeysOfOtherPlugin.solutionPermissionRequest);
    if (permissionRequest) {
      this.permissionRequest = permissionRequest as string;
    } else {
      throw ResultFactory.SystemError(
        GetConfigError.name,
        GetConfigError.message(
          Errors.GetConfigError(ConfigKeysOfOtherPlugin.solutionPermissionRequest, Plugins.solution)
        )
      );
    }
  }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { PluginContext, AzureSolutionSettings } from "@microsoft/teamsfx-api";
import {
  AadPlugin,
  FunctionPlugin,
  SpfxPlugin,
  FrontendHostingPlugin,
  BotPlugin,
  RuntimeConnectorPlugin,
} from "./constants";

export class ProjectSettingLoader {
  public static isSpfx = (ctx: PluginContext): boolean =>
    !!(ctx.projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === SpfxPlugin.Name
    );

  public static includeFrontend = (ctx: PluginContext): boolean =>
    !!(ctx.projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === FrontendHostingPlugin.Name
    );

  public static includeBackend = (ctx: PluginContext): boolean =>
    !!(ctx.projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === FunctionPlugin.Name
    );

  public static includeBot = (ctx: PluginContext): boolean =>
    !!(ctx.projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === BotPlugin.Name
    );

  public static includeAuth(ctx: PluginContext): boolean {
    const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      ?.activeResourcePlugins;
    const includeAad = selectedPlugins?.some((pluginName) => pluginName === AadPlugin.Name);
    const includeSimpleAuth = selectedPlugins?.some(
      (pluginName) => pluginName === RuntimeConnectorPlugin.Name
    );

    return includeAad && (!this.includeFrontend(ctx) || includeSimpleAuth);
  }
  public static isMigrateFromV1 = (ctx: PluginContext): boolean =>
    !!ctx?.projectSettings?.solutionSettings?.migrateFromV1;
}

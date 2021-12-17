// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { AzureSolutionSettings, Context, v2 } from "@microsoft/teamsfx-api";
import {
  AadPlugin,
  FunctionPlugin,
  SpfxPlugin,
  FrontendHostingPlugin,
  BotPlugin,
  RuntimeConnectorPlugin,
} from "../../../plugins/resource/localdebug/constants";

export class ProjectSettingLoader {
  public static isSpfx = (ctx: v2.Context): boolean =>
    !!(ctx.projectSetting?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === SpfxPlugin.Name
    );

  public static includeFrontend = (ctx: v2.Context): boolean =>
    !!(ctx.projectSetting?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === FrontendHostingPlugin.Name
    );

  public static includeBackend = (ctx: v2.Context): boolean =>
    !!(ctx.projectSetting?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === FunctionPlugin.Name
    );

  public static includeBot = (ctx: v2.Context): boolean =>
    !!(ctx.projectSetting?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === BotPlugin.Name
    );

  public static includeAuth(ctx: v2.Context): boolean {
    const selectedPlugins = (ctx.projectSetting?.solutionSettings as AzureSolutionSettings)
      ?.activeResourcePlugins;
    const includeAad = selectedPlugins?.some((pluginName) => pluginName === AadPlugin.Name);
    const includeSimpleAuth = selectedPlugins?.some(
      (pluginName) => pluginName === RuntimeConnectorPlugin.Name
    );

    return includeAad && (!this.includeFrontend(ctx) || includeSimpleAuth);
  }
  public static isMigrateFromV1 = (ctx: v2.Context): boolean =>
    !!ctx?.projectSetting?.solutionSettings?.migrateFromV1;
}

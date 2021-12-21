// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { AzureSolutionSettings, v2 } from "@microsoft/teamsfx-api";
import { ResourcePlugins } from "../../../../../common/constants";

export class ContextHelper {
  public static isSpfx = (ctx: v2.Context): boolean =>
    !!(ctx.projectSetting?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === ResourcePlugins.SPFx
    );

  public static includeFrontend = (ctx: v2.Context): boolean =>
    !!(ctx.projectSetting?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === ResourcePlugins.FrontendHosting
    );

  public static includeBackend = (ctx: v2.Context): boolean =>
    !!(ctx.projectSetting?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === ResourcePlugins.Function
    );

  public static includeBot = (ctx: v2.Context): boolean =>
    !!(ctx.projectSetting?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === ResourcePlugins.Bot
    );

  public static includeAuth(ctx: v2.Context): boolean {
    const selectedPlugins = (ctx.projectSetting?.solutionSettings as AzureSolutionSettings)
      ?.activeResourcePlugins;
    const includeAad = selectedPlugins?.some((pluginName) => pluginName === ResourcePlugins.Aad);
    const includeSimpleAuth = selectedPlugins?.some(
      (pluginName) => pluginName === ResourcePlugins.SimpleAuth
    );

    return includeAad && (!this.includeFrontend(ctx) || includeSimpleAuth);
  }
  public static isMigrateFromV1 = (ctx: v2.Context): boolean =>
    !!ctx?.projectSetting?.solutionSettings?.migrateFromV1;
}

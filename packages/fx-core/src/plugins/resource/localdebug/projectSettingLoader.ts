// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { PluginContext, AzureSolutionSettings } from "@microsoft/teamsfx-api";

export class ProjectSettingLoader {
  public static isSpfx = (ctx: PluginContext): boolean =>
    !!(ctx.projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === "fx-resource-spfx"
    );

  public static includeFrontend = (ctx: PluginContext): boolean =>
    !!(ctx.projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === "fx-resource-frontend-hosting"
    );

  public static includeBackend = (ctx: PluginContext): boolean =>
    !!(ctx.projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === "fx-resource-function"
    );

  public static includeBot = (ctx: PluginContext): boolean =>
    !!(ctx.projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === "fx-resource-bot"
    );

  public static includeAuth(ctx: PluginContext): boolean {
    const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      ?.activeResourcePlugins;
    const includeAad = selectedPlugins?.some(
      (pluginName) => pluginName === "fx-resource-aad-app-for-teams"
    );
    const includeSimpleAuth = selectedPlugins?.some(
      (pluginName) => pluginName === "fx-resource-simple-auth"
    );

    return includeAad && (!this.includeFrontend(ctx) || includeSimpleAuth);
  }
}

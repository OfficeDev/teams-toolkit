// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { AzureSolutionSettings, ProjectSettings } from "@microsoft/teamsfx-api";
import { ResourcePlugins } from "../constants";
import { IsSimpleAuthEnabled } from "../tools";

export class ProjectSettingsHelper {
  public static isSpfx = (projectSettings: ProjectSettings | undefined): boolean =>
    !!(projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === ResourcePlugins.SPFx
    );

  public static includeFrontend = (projectSettings: ProjectSettings | undefined): boolean =>
    !!(projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === ResourcePlugins.FrontendHosting
    );

  public static includeBackend = (projectSettings: ProjectSettings | undefined): boolean =>
    !!(projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === ResourcePlugins.Function
    );

  public static includeBot = (projectSettings: ProjectSettings | undefined): boolean =>
    !!(projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.some(
      (pluginName) => pluginName === ResourcePlugins.Bot
    );

  public static includeAAD(projectSettings: ProjectSettings | undefined): boolean {
    const selectedPlugins = (projectSettings?.solutionSettings as AzureSolutionSettings)
      ?.activeResourcePlugins;
    return selectedPlugins?.some((pluginName) => pluginName === ResourcePlugins.Aad);
  }

  public static includeSimpleAuth(projectSettings: ProjectSettings | undefined): boolean {
    const includeSimpleAuth = IsSimpleAuthEnabled(projectSettings);
    return !this.includeFrontend(projectSettings) || includeSimpleAuth;
  }

  public static isMigrateFromV1 = (projectSettings: ProjectSettings | undefined): boolean =>
    !!projectSettings?.solutionSettings?.migrateFromV1;
}

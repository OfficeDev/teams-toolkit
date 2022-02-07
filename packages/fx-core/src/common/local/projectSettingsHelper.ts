// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { AzureSolutionSettings, ProjectSettings } from "@microsoft/teamsfx-api";
import {
  AzureResourceFunction,
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  TabOptionItem,
} from "../../plugins/solution/fx-solution/question";
import { ResourcePlugins } from "../../plugins/solution/fx-solution/ResourcePluginContainer";
import { IsSimpleAuthEnabled } from "../tools";

export class ProjectSettingsHelper {
  // keep the same logic as plugin.activate()
  public static isSpfx = (projectSettings: ProjectSettings | undefined): boolean =>
    (projectSettings?.solutionSettings as AzureSolutionSettings)?.hostType ===
    HostTypeOptionSPFx.id;

  public static includeFrontend(projectSettings: ProjectSettings | undefined): boolean {
    const solutionSettings = projectSettings?.solutionSettings as AzureSolutionSettings;
    const cap = solutionSettings?.capabilities || [];
    return solutionSettings?.hostType === HostTypeOptionAzure.id && cap.includes(TabOptionItem.id);
  }

  public static includeBackend(projectSettings: ProjectSettings | undefined): boolean {
    const solutionSettings = projectSettings?.solutionSettings as AzureSolutionSettings;
    const azureResources = (solutionSettings?.azureResources as string[]) || [];
    return (
      solutionSettings?.hostType === HostTypeOptionAzure.id &&
      azureResources.includes(AzureResourceFunction.id)
    );
  }

  public static includeBot(projectSettings: ProjectSettings | undefined): boolean {
    const cap = (projectSettings?.solutionSettings as AzureSolutionSettings)?.capabilities || [];
    return cap.includes(BotOptionItem.id) || cap.includes(MessageExtensionItem.id);
  }

  public static includeAAD = (projectSettings: ProjectSettings | undefined): boolean =>
    !ProjectSettingsHelper.isMigrateFromV1(projectSettings) &&
    (projectSettings?.solutionSettings as AzureSolutionSettings)?.activeResourcePlugins?.includes(
      ResourcePlugins.AadPlugin
    );

  public static includeSimpleAuth = (projectSettings: ProjectSettings | undefined): boolean =>
    // TODO: update this when retiring simple auth service
    !ProjectSettingsHelper.isMigrateFromV1(projectSettings) &&
    !!IsSimpleAuthEnabled(projectSettings);

  public static isMigrateFromV1 = (projectSettings: ProjectSettings | undefined): boolean =>
    !!projectSettings?.solutionSettings?.migrateFromV1;
}

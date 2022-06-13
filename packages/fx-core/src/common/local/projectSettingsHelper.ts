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
  OfficeAddinItem,
  TabOptionItem,
} from "../../plugins/solution/fx-solution/question";
import { isAADEnabled, IsSimpleAuthEnabled } from "../tools";
import { ResourcePlugins } from "../constants";
import { BotCapabilities, BotHostTypeName, BotHostTypes } from "./constants";

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

  public static includeOfficeAddin(projectSettings: ProjectSettings | undefined): boolean {
    const solutionSettings = projectSettings?.solutionSettings as AzureSolutionSettings;
    const cap = solutionSettings?.capabilities || [];
    return (
      solutionSettings?.hostType === HostTypeOptionAzure.id && cap.includes(OfficeAddinItem.id)
    );
  }

  public static includeBackend(projectSettings: ProjectSettings | undefined): boolean {
    const solutionSettings = projectSettings?.solutionSettings as AzureSolutionSettings;
    const azureResources = (solutionSettings?.azureResources as string[]) || [];
    return (
      solutionSettings?.hostType === HostTypeOptionAzure.id &&
      azureResources.includes(AzureResourceFunction.id)
    );
  }

  public static includeFuncHostedBot(projectSettings: ProjectSettings | undefined): boolean {
    const botHostType = projectSettings?.pluginSettings?.[ResourcePlugins.Bot]?.[BotHostTypeName];
    const cap = (projectSettings?.solutionSettings as AzureSolutionSettings)?.capabilities || [];
    return cap.includes(BotOptionItem.id) && botHostType === BotHostTypes.AzureFunctions;
  }

  public static includeBot(projectSettings: ProjectSettings | undefined): boolean {
    const cap = (projectSettings?.solutionSettings as AzureSolutionSettings)?.capabilities || [];
    return cap.includes(BotOptionItem.id) || cap.includes(MessageExtensionItem.id);
  }

  public static includeAAD = (projectSettings: ProjectSettings | undefined): boolean =>
    !!isAADEnabled(projectSettings?.solutionSettings as AzureSolutionSettings);

  public static includeSimpleAuth = (projectSettings: ProjectSettings | undefined): boolean =>
    // TODO: update this when retiring simple auth service
    !!IsSimpleAuthEnabled(projectSettings);

  public static getBotCapabilities(projectSettings: ProjectSettings | undefined): string[] {
    return (projectSettings?.pluginSettings?.[ResourcePlugins.Bot]?.[BotCapabilities] ||
      []) as string[];
  }
}

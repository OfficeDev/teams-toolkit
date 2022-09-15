// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ProjectSettings, ProjectSettingsV3 } from "@microsoft/teamsfx-api";
import { ComponentNames } from "../../component/constants";
import { getComponent } from "../../component/workflow";
import {
  hasAAD,
  hasApi,
  hasAzureTab,
  hasBot,
  hasFunctionBot,
  hasSimpleAuth,
  hasSPFxTab,
} from "../projectSettingsHelperV3";

export class ProjectSettingsHelper {
  // keep the same logic as plugin.activate()
  public static isSpfx = (projectSettings: ProjectSettings | undefined): boolean =>
    hasSPFxTab(projectSettings as ProjectSettingsV3);

  public static includeFrontend(projectSettings: ProjectSettings | undefined): boolean {
    return hasAzureTab(projectSettings as ProjectSettingsV3);
  }

  public static includeBackend(projectSettings: ProjectSettings | undefined): boolean {
    return hasApi(projectSettings as ProjectSettingsV3);
  }

  public static includeFuncHostedBot(projectSettings: ProjectSettings | undefined): boolean {
    return hasFunctionBot(projectSettings as ProjectSettingsV3);
  }

  public static includeBot(projectSettings: ProjectSettings | undefined): boolean {
    return hasBot(projectSettings as ProjectSettingsV3);
  }

  public static includeAAD = (projectSettings: ProjectSettings | undefined): boolean =>
    hasAAD(projectSettings as ProjectSettingsV3);

  public static includeSimpleAuth = (projectSettings: ProjectSettings | undefined): boolean =>
    hasSimpleAuth(projectSettings as ProjectSettingsV3);

  public static getBotCapabilities(projectSettings: ProjectSettings | undefined): string[] {
    const bot = getComponent(projectSettings as ProjectSettingsV3, ComponentNames.TeamsBot);
    return bot?.capabilities || [];
  }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigValue, PluginContext, AzureSolutionSettings, Stage } from "@microsoft/teamsfx-api";

import { LocalDebugConfig } from "./localDebugConfig";
import { ProvisionConfig } from "./provisionConfig";
import { ScaffoldConfig } from "./scaffoldConfig";
import {
  PluginSolution,
  PluginAAD,
  QuestionBotScenarioToPluginActRoles,
} from "../resources/strings";
import { PluginActRoles } from "../enums/pluginActRoles";
import { DeployConfig } from "./deployConfig";
import * as utils from "../utils/common";
import { AzureSolutionQuestionNames } from "../../../solution/fx-solution/question";
import { isBotNotificationEnabled } from "../../../../common";

export class TeamsBotConfig {
  public scaffold: ScaffoldConfig = new ScaffoldConfig();
  public provision: ProvisionConfig = new ProvisionConfig();
  public localDebug: LocalDebugConfig = new LocalDebugConfig();
  public deploy: DeployConfig = new DeployConfig();

  public teamsAppClientId?: string;
  public teamsAppClientSecret?: string;
  public teamsAppTenant?: string;
  public applicationIdUris?: string;
  public actRoles: PluginActRoles[] = [];
  public resourceNameSuffix = "";

  public isM365: boolean | undefined = undefined;

  public async restoreConfigFromContext(context: PluginContext, isScaffold = false): Promise<void> {
    await this.scaffold.restoreConfigFromContext(context, isScaffold);
    await this.provision.restoreConfigFromContext(context);
    await this.localDebug.restoreConfigFromContext(context);
    await this.deploy.restoreConfigFromContext(context);

    this.isM365 = context.projectSettings?.isM365;

    this.teamsAppClientId = context.envInfo.state
      .get(PluginAAD.PLUGIN_NAME)
      ?.get(PluginAAD.CLIENT_ID) as string;

    this.teamsAppClientSecret = context.envInfo.state
      .get(PluginAAD.PLUGIN_NAME)
      ?.get(PluginAAD.CLIENT_SECRET) as string;

    this.teamsAppTenant = context.envInfo.state
      .get(PluginSolution.PLUGIN_NAME)
      ?.get(PluginSolution.M365_TENANT_ID) as string;

    this.applicationIdUris = context.envInfo.state
      .get(PluginAAD.PLUGIN_NAME)
      ?.get(PluginAAD.APPLICATION_ID_URIS) as string;

    const capabilities = (context.projectSettings?.solutionSettings as AzureSolutionSettings)
      .capabilities;

    if (capabilities?.includes(PluginActRoles.Bot)) {
      const scenarios = context.answers?.[AzureSolutionQuestionNames.Scenarios];
      if (isBotNotificationEnabled() && Array.isArray(scenarios) && scenarios.length > 0) {
        const scenarioActRoles = scenarios
          .map((item) => QuestionBotScenarioToPluginActRoles.get(item))
          .filter((item): item is PluginActRoles => item !== undefined);
        // dedup
        this.actRoles = [...new Set([...this.actRoles, ...scenarioActRoles])];
      } else {
        // for legacy bot
        this.actRoles.push(PluginActRoles.Bot);
      }
    }

    if (
      capabilities?.includes(PluginActRoles.MessageExtension) &&
      !this.actRoles.includes(PluginActRoles.MessageExtension)
    ) {
      this.actRoles.push(PluginActRoles.MessageExtension);
    }

    const resourceNameSuffixValue: ConfigValue = context.envInfo.state
      .get(PluginSolution.PLUGIN_NAME)
      ?.get(PluginSolution.RESOURCE_NAME_SUFFIX);
    this.resourceNameSuffix = resourceNameSuffixValue
      ? (resourceNameSuffixValue as string)
      : utils.genUUID();
  }

  public saveConfigIntoContext(context: PluginContext): void {
    this.scaffold.saveConfigIntoContext(context);
    this.provision.saveConfigIntoContext(context);
    this.localDebug.saveConfigIntoContext(context);
    this.deploy.saveConfigIntoContext(context);
  }

  public toString(): string {
    return JSON.stringify(this);
  }
}

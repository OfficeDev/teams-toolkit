// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ConfigValue,
  PluginContext,
  AzureSolutionSettings,
  v2,
  Inputs,
  v3,
} from "@microsoft/teamsfx-api";

import { LocalDebugConfig } from "./localDebugConfig";
import { ProvisionConfig } from "./provisionConfig";
import { ScaffoldConfig } from "./scaffoldConfig";
import { PluginSolution, PluginAAD } from "../resources/strings";
import { PluginActRoles } from "../enums/pluginActRoles";
import { DeployConfig } from "./deployConfig";
import * as utils from "../utils/common";

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

  public async restoreConfigFromContext(context: PluginContext): Promise<void> {
    await this.scaffold.restoreConfigFromContext(context);
    await this.provision.restoreConfigFromContext(context);
    await this.localDebug.restoreConfigFromContext(context);
    await this.deploy.restoreConfigFromContext(context);

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

    if (capabilities?.includes(PluginActRoles.Bot) && !this.actRoles.includes(PluginActRoles.Bot)) {
      this.actRoles.push(PluginActRoles.Bot);
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

  public async restoreConfigFromContextV3(
    context: v2.Context,
    inputs: Inputs,
    envInfo?: v3.EnvInfoV3
  ): Promise<void> {
    await this.scaffold.restoreConfigFromContextV3(context, inputs, envInfo);
    await this.provision.restoreConfigFromContextV3(context, inputs, envInfo!);
    await this.localDebug.restoreConfigFromContext(context);
    await this.deploy.restoreConfigFromContext(context);

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

    if (capabilities?.includes(PluginActRoles.Bot) && !this.actRoles.includes(PluginActRoles.Bot)) {
      this.actRoles.push(PluginActRoles.Bot);
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

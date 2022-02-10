// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  FxError,
  Inputs,
  ProjectSettings,
  Result,
  v2,
} from "@microsoft/teamsfx-api";
import { Context, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { KeyVaultPlugin } from "..";
import { AzureResourceKeyVault, HostTypeOptionAzure } from "../../../solution/fx-solution/question";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import { generateResourceTemplateAdapter, updateResourceTemplateAdapter } from "../../utils4v2";

@Service(ResourcePluginsV2.KeyVaultPlugin)
export class KeyVaultPluginV2 implements ResourcePlugin {
  name = "fx-resource-key-vault";
  displayName = "Key Vault Plugin";
  @Inject(ResourcePlugins.KeyVaultPlugin)
  plugin!: KeyVaultPlugin;

  activate(projectSettings: ProjectSettings): boolean {
    const solutionSettings = projectSettings.solutionSettings as AzureSolutionSettings;
    const azureResources = solutionSettings.azureResources || [];
    return (
      solutionSettings.hostType === HostTypeOptionAzure.id &&
      azureResources.includes(AzureResourceKeyVault.id)
    );
  }
  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return generateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return updateResourceTemplateAdapter(ctx, inputs, this.plugin);
  }
}

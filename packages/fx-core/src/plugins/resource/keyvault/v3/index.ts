// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { AzureSolutionSettings, FxError, ok, Result, v2, v3 } from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import { Bicep } from "../../../../common/constants";
import { generateBicepFromFile } from "../../../../common/tools";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { getTemplatesFolder } from "../../../../folder";
import { AzureResourceKeyVault } from "../../../solution/fx-solution/question";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { Constants } from "../constants";

@Service(BuiltInFeaturePluginNames.keyVault)
export class KeyVaultPluginV3 implements v3.PluginV3 {
  name = BuiltInFeaturePluginNames.keyVault;
  displayName = "Key Vault Plugin";

  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.keyVault } })])
  async generateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.AddFeatureInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const pluginCtx = { plugins: inputs.allPluginsAfterAdd };
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "keyvault",
      "bicep"
    );

    const provisionModuleResult = path.join(
      bicepTemplateDirectory,
      Constants.provisionModuleTemplateFileName
    );
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(provisionModuleResult, pluginCtx);
    const result: v3.BicepTemplate = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { keyVault: provisionModules },
      },
      Reference: {
        m365ClientSecretReference: Constants.KeyVaultBicep.m365ClientSecretReference,
        botClientSecretReference: Constants.KeyVaultBicep.botClientSecretReference,
      },
    };
    return ok([result]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.keyVault } })])
  async addInstance(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<string[], FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    const azureResources = solutionSettings.azureResources;
    if (!azureResources.includes(AzureResourceKeyVault.id))
      azureResources.push(AzureResourceKeyVault.id);
    return ok([BuiltInFeaturePluginNames.identity]);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.keyVault } })])
  async updateBicep(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.UpdateInputs
  ): Promise<Result<v3.BicepTemplate[], FxError>> {
    const result: v3.BicepTemplate = {
      Reference: {
        m365ClientSecretReference: Constants.KeyVaultBicep.m365ClientSecretReference,
        botClientSecretReference: Constants.KeyVaultBicep.botClientSecretReference,
      },
    };
    return ok([result]);
  }
}

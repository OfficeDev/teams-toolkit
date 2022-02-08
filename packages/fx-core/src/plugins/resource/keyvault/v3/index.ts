// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { AzureSolutionSettings, err, FxError, ok, Result, v2, v3 } from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep } from "../../../../common/constants";
import { generateBicepFromFile } from "../../../../common/tools";
import { CommonErrorHandlerMW } from "../../../../core/middleware/CommonErrorHandlerMW";
import { getTemplatesFolder } from "../../../../folder";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { Constants } from "../constants";

@Service(BuiltInFeaturePluginNames.keyVault)
export class KeyVaultPluginV3 implements v3.FeaturePlugin {
  name = BuiltInFeaturePluginNames.keyVault;
  displayName = "Key Vault Plugin";
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.keyVault } })])
  async generateResourceTemplate(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    const pluginCtx = { plugins: solutionSettings ? solutionSettings.activeResourcePlugins : [] };
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
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { keyVault: provisionModules },
      },
      Reference: {
        m365ClientSecretReference: Constants.KeyVaultBicep.m365ClientSecretReference,
        botClientSecretReference: Constants.KeyVaultBicep.botClientSecretReference,
      },
    };
    return ok({ kind: "bicep", template: result });
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.keyVault } })])
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate | undefined, FxError>> {
    const armRes = await this.generateResourceTemplate(ctx, inputs);
    if (armRes.isErr()) return err(armRes.error);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    return ok(armRes.value);
  }
  @hooks([CommonErrorHandlerMW({ telemetry: { component: BuiltInFeaturePluginNames.keyVault } })])
  async afterOtherFeaturesAdded(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.OtherFeaturesAddedInputs
  ): Promise<Result<v2.ResourceTemplate | undefined, FxError>> {
    const result: ArmTemplateResult = {
      Reference: {
        m365ClientSecretReference: Constants.KeyVaultBicep.m365ClientSecretReference,
        botClientSecretReference: Constants.KeyVaultBicep.botClientSecretReference,
      },
    };
    return ok({ kind: "bicep", template: result });
  }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, PluginContext, Result, AzureSolutionSettings } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as fs from "fs-extra";
import { getTemplatesFolder } from "../../..";
import { ArmTemplateResult } from "../../../common/armInterface";
import { Bicep, ConstantString } from "../../../common/constants";
import { Constants } from "./constants";
import { ResultFactory } from "./result";
import { getActivatedV2ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../solution/fx-solution/v2/adaptor";
import { generateBicepFiles } from "../../../common/tools";

export class KeyVaultPluginImpl {
  public async generateArmTemplates(
    ctx: PluginContext
  ): Promise<Result<ArmTemplateResult, FxError>> {
    const azureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
    const plugins = getActivatedV2ResourcePlugins(azureSolutionSettings).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };

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
    const provisionOrchestration = await generateBicepFiles(
      await fs.readFile(
        path.join(bicepTemplateDirectory, Bicep.ProvisionFileName),
        ConstantString.UTF8Encoding
      ),
      pluginCtx
    );
    const provisionModules = await generateBicepFiles(
      await fs.readFile(provisionModuleResult, ConstantString.UTF8Encoding),
      pluginCtx
    );
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

    return ResultFactory.Success(result);
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<Result<ArmTemplateResult, FxError>> {
    const result: ArmTemplateResult = {
      Reference: {
        m365ClientSecretReference: Constants.KeyVaultBicep.m365ClientSecretReference,
        botClientSecretReference: Constants.KeyVaultBicep.botClientSecretReference,
      },
    };

    return ResultFactory.Success(result);
  }
}

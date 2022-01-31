// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings, err, FxError, ok, Result, v2, v3 } from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep } from "../../../../common/constants";
import { generateBicepFromFile } from "../../../../common/tools";
import { getTemplatesFolder } from "../../../../folder";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { IdentityConfig } from "../config";
import { IdentityBicep, IdentityBicepFile } from "../constants";

@Service(BuiltInFeaturePluginNames.identity)
export class IdentityPluginV3 implements v3.FeaturePlugin {
  name = BuiltInFeaturePluginNames.identity;
  displayName = "Microsoft Identity";
  description = "Microsoft Identity";
  template: any;
  parameters: any;
  armTemplateDir: string = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "templates",
    "plugins",
    "resource",
    "identity"
  );
  config: IdentityConfig = new IdentityConfig();
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
      "identity",
      "bicep"
    );
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDirectory, IdentityBicepFile.moduleTempalteFilename),
      pluginCtx
    );
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { identity: provisionModules },
      },
      Reference: {
        identityName: IdentityBicep.identityName,
        identityClientId: IdentityBicep.identityClientId,
        identityResourceId: IdentityBicep.identityResourceId,
        identityPrincipalId: IdentityBicep.identityPrincipalId,
      },
    };
    return ok({ kind: "bicep", template: result });
  }
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath,
    envInfo?: v3.EnvInfoV3
  ): Promise<Result<v2.ResourceTemplate | undefined, FxError>> {
    const armRes = await this.generateResourceTemplate(ctx, inputs);
    if (armRes.isErr()) return err(armRes.error);
    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const activeResourcePlugins = solutionSettings.activeResourcePlugins;
    if (!activeResourcePlugins.includes(this.name)) activeResourcePlugins.push(this.name);
    return ok(armRes.value);
  }
  // async afterOtherFeaturesAdded(
  //   ctx: v3.ContextWithManifestProvider,
  //   inputs: v3.OtherFeaturesAddedInputs,
  //   envInfo?: v3.EnvInfoV3
  // ): Promise<Result<v2.ResourceTemplate | undefined, FxError>> {
  //   ctx.logProvider.info(Messages.StartUpdateArmTemplates(this.name));
  //   const result: ArmTemplateResult = {
  //     Reference: {
  //       identityName: IdentityBicep.identityName,
  //       identityClientId: IdentityBicep.identityClientId,
  //       identityResourceId: IdentityBicep.identityResourceId,
  //       identityPrincipalId: IdentityBicep.identityPrincipalId,
  //     },
  //   };
  //   return ok({ kind: "bicep", template: result });
  // }
}

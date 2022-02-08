// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ok,
  Void,
  err,
  FxError,
  Result,
  v2,
  v3,
  AzureSolutionSettings,
  TokenProvider,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import path from "path";
import fs from "fs-extra";
import { getTemplatesFolder } from "../../../../folder";
import { Bicep } from "../../../../common/constants";
import { generateBicepFromFile } from "../../../../common/tools";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { PathInfo } from "../dotnet/constants";
import { ResourceNameFactory } from "../utils/resourceNameFactory";
import { MaxLengths } from "../constants";
import { BotAuthCredential } from "../botAuthCredential";
import { AADRegistration } from "../aadRegistration";

@Service(BuiltInFeaturePluginNames.bot)
export class BotPluginV3 implements v3.FeaturePlugin {
  name = BuiltInFeaturePluginNames.bot;
  displayName = "Teams Bot";
  description = "Teams Bot";

  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    const armResult = await this.generateResourceTemplate(ctx, inputs);
    if (armResult.isErr()) return err(armResult.error);
    return ok(armResult.value);
  }

  async scaffold(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<Void | undefined, FxError>> {
    return ok(Void);
  }

  async generateResourceTemplate(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    ctx.logProvider.info(`[${this.name}] Start generating Arm template`);

    const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
    const pluginCtx = { plugins: solutionSettings.activeResourcePlugins ?? [] };

    const bicepTemplateDir = path.join(getTemplatesFolder(), PathInfo.BicepTemplateRelativeDir);
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, PathInfo.ProvisionModuleTemplateFileName),
      pluginCtx
    );

    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { botservice: provisionModules },
      },
      Parameters: JSON.parse(
        await fs.readFile(path.join(bicepTemplateDir, Bicep.ParameterFileName), "utf-8")
      ),
    };

    ctx.logProvider.info(`[${this.name}] Successfully generated Arm template`);
    return ok([{ kind: "bicep", template: result }]);
  }

  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<v3.CloudResource, FxError>> {
    const bot = envInfo.config as v3.AzureBot;
    if (bot.botId && bot.botPassword) {
      return ok(Void);
    }

    const solution = envInfo.state.solution as v3.AzureSolutionConfig;
    const token = await tokenProvider.graphTokenProvider.getAccessToken();
    const aadDisplayName = ResourceNameFactory.createCommonName(
      solution.resourceNameSuffix,
      ctx.projectSetting.appName,
      MaxLengths.AAD_DISPLAY_NAME
    );

    const botAuthCreds: BotAuthCredential = await AADRegistration.registerAADAppAndGetSecretByGraph(
      token!,
      aadDisplayName
    );
    return ok({
      botId: botAuthCreds.clientId,
      objectId: botAuthCreds.objectId,
      botPassword: botAuthCreds.clientSecret,
    } as v3.AzureBot);
  }
}

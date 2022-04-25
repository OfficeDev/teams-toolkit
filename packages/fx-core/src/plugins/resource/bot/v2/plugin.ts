// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, Inputs, Json, ok, Result, TokenProvider, v2, Void } from "@microsoft/teamsfx-api";

import {
  Context,
  DeepReadonly,
  DeploymentInputs,
  EnvInfoV2,
  ProvisionInputs,
  ResourceTemplate,
} from "@microsoft/teamsfx-api/build/v2";
import { mergeTemplates } from "./bicep";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { BotSolution } from "./botSolution";
import { scaffold } from "./scaffold";
import * as utils from "../utils/common";
import { PluginBot } from "../resources/strings";
import { QuestionNames } from "../constants";
import { HostTypeTriggerOptions } from "../question";
import path from "path";
import { HostingResourceFactory } from "./hostingFactory";

export class TeamsBotV2Impl {
  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    const workingPath = path.join(inputs.projectPath ?? "", "bot");
    const hostTypeTriggers = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER];
    let hostType;
    if (Array.isArray(hostTypeTriggers)) {
      const hostTypes = hostTypeTriggers.map(
        (item) => HostTypeTriggerOptions.find((option) => option.id === item)?.hostType
      );
      hostType = hostTypes ? hostTypes[0] : undefined;
    }
    utils.checkAndSavePluginSettingV2(ctx, PluginBot.HOST_TYPE, hostType);

    const templates = BotSolution.getTemplates(ctx, inputs);
    await Promise.all(
      templates.map(async (template) => {
        await scaffold(template, workingPath);
      })
    );

    return ok(Void);
  }

  async generateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    const bicepConfigs = BotSolution.getBicepConfigs(ctx, inputs);

    const hostingResources = HostingResourceFactory.getHostingResources(ctx, "fx-resource-bot");
    const templates: ArmTemplateResult[] = await Promise.all(
      hostingResources.map(async (hosting) => await hosting.generateBicep(ctx, bicepConfigs))
    );
    const result = mergeTemplates(templates);

    return ok({ kind: "bicep", template: result });
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    const bicepConfigs = BotSolution.getBicepConfigs(ctx, inputs);
    const hostingResources = HostingResourceFactory.getHostingResources(ctx, "fx-resource-bot");
    const templates: ArmTemplateResult[] = await Promise.all(
      hostingResources.map(async (hosting) => await hosting.updateBicep(ctx, bicepConfigs))
    );
    const result = mergeTemplates(templates);

    return ok({ kind: "bicep", template: result });
  }

  async configureResource(
    ctx: Context,
    inputs: ProvisionInputs,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  async deploy(
    ctx: Context,
    inputs: DeploymentInputs,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    const packDir = await BotSolution.localBuild(ctx, inputs);
    // TODO: zip packDir and upload to Azure Web App or Azure Function
    return ok(Void);
  }

  async provisionLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider,
    envInfo?: EnvInfoV2
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  async configureLocalResource(
    ctx: Context,
    inputs: Inputs,
    localSettings: Json,
    tokenProvider: TokenProvider,
    envInfo?: v2.EnvInfoV2 | undefined
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }
}

export default new TeamsBotV2Impl();

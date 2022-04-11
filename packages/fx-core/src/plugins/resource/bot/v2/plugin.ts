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
import { getGenerators, mergeTemplates } from "./bicep";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { CodeTemplateProvider } from "./codeTemplateProvider";
import { scaffold } from "./scaffold";

export class TeamsBotV2Impl {
  async scaffoldSourceCode(ctx: Context, inputs: Inputs): Promise<Result<Void, FxError>> {
    const templates = CodeTemplateProvider.getTemplates(ctx, inputs);
    const workingPath = inputs.projectPath ?? "";

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
    const configuration = CodeTemplateProvider.getConfigurations(ctx, inputs);

    const generators = getGenerators(ctx, inputs);
    const templates: ArmTemplateResult[] = await Promise.all(
      generators.map(async (generator) => await generator.generateBicep(ctx, configuration))
    );
    const result = mergeTemplates(templates);

    return ok({ kind: "bicep", template: result });
  }

  async updateResourceTemplate(
    ctx: Context,
    inputs: Inputs
  ): Promise<Result<ResourceTemplate, FxError>> {
    const configuration = CodeTemplateProvider.getConfigurations(ctx, inputs);
    const generators = getGenerators(ctx, inputs);
    const templates: ArmTemplateResult[] = await Promise.all(
      generators.map(async (generator) => await generator.updateBicep(ctx, configuration))
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

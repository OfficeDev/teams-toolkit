// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  err,
  FxError,
  ok,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import { Service } from "typedi";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep } from "../../../../common/constants";
import {
  genTemplateRenderReplaceFn,
  removeTemplateExtReplaceFn,
  ScaffoldAction,
  ScaffoldActionName,
  ScaffoldContext,
  scaffoldFromTemplates,
} from "../../../../common/template-utils/templatesActions";
import { generateBicepFromFile } from "../../../../common/tools";
import { getTemplatesFolder } from "../../../../folder";
import { BuiltInFeaturePluginNames } from "../../../solution/fx-solution/v3/constants";
import { Constants, FrontendOutputBicepSnippet, FrontendPathInfo } from "../constants";
import {
  TemplateZipFallbackError,
  UnknownScaffoldError,
  UnzipTemplateError,
} from "../resources/errors";
import { Messages } from "../resources/messages";
import { ScaffoldProgress } from "../resources/steps";
import { Scenario, TemplateInfo } from "../resources/templateInfo";
import "./AzureStoragePlugin";
import "./ReactTabScaffoldPlugin";

@Service(BuiltInFeaturePluginNames.frontend)
export class NodeJSTabFrontendPlugin implements v3.FeaturePlugin {
  name = BuiltInFeaturePluginNames.frontend;
  displayName = "NodeJS Tab frontend";
  description = "Tab frontend with React Framework using Javascript/Typescript";
  async scaffold(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<Void | undefined, FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    ctx.logProvider.info(Messages.StartScaffold(this.name));
    const progress = ctx.userInteraction.createProgressBar(
      Messages.ScaffoldProgressTitle,
      Object.entries(ScaffoldProgress.steps).length
    );
    await progress.start(Messages.ProgressStart);
    await progress.next(ScaffoldProgress.steps.Scaffold);
    const template = inputs.template;
    const language = template === "ReactTab_TS" ? "ts" : "js";
    const componentPath = path.join(inputs.projectPath, FrontendPathInfo.WorkingDir);
    const hasFunction = solutionSettings
      ? solutionSettings.activeResourcePlugins.includes(BuiltInFeaturePluginNames.function)
      : false;
    const variables = {
      showFunction: hasFunction.toString(),
    };
    await scaffoldFromTemplates({
      group: TemplateInfo.TemplateGroupName,
      lang: language,
      scenario: Scenario.Default,
      templatesFolderName: FrontendPathInfo.TemplateFolderName,
      dst: componentPath,
      fileNameReplaceFn: removeTemplateExtReplaceFn,
      fileDataReplaceFn: genTemplateRenderReplaceFn(variables),
      onActionEnd: async (action: ScaffoldAction, context: ScaffoldContext) => {
        if (action.name === ScaffoldActionName.FetchTemplatesUrlWithTag) {
          ctx.logProvider.info(Messages.getTemplateFrom(context.zipUrl ?? Constants.EmptyString));
        }
      },
      onActionError: async (action: ScaffoldAction, context: ScaffoldContext, error: Error) => {
        ctx.logProvider.info(error.toString());
        switch (action.name) {
          case ScaffoldActionName.FetchTemplatesUrlWithTag:
          case ScaffoldActionName.FetchTemplatesZipFromUrl:
            // TelemetryHelper.sendScaffoldFallbackEvent(new TemplateManifestError(error.message));//TODO
            ctx.logProvider.info(Messages.FailedFetchTemplate);
            break;
          case ScaffoldActionName.FetchTemplateZipFromLocal:
            throw new TemplateZipFallbackError();
          case ScaffoldActionName.Unzip:
            throw new UnzipTemplateError();
          default:
            throw new UnknownScaffoldError();
        }
      },
    });
    await progress.end(true);
    ctx.logProvider.info(Messages.EndScaffold(this.name));
    return ok(undefined);
  }
  async generateResourceTemplate(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    ctx.logProvider.info(Messages.StartGenerateArmTemplates(this.name));
    const solutionSettings = ctx.projectSetting.solutionSettings as
      | AzureSolutionSettings
      | undefined;
    const pluginCtx = { plugins: solutionSettings ? solutionSettings.activeResourcePlugins : [] };
    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      FrontendPathInfo.BicepTemplateRelativeDir
    );
    const provisionFilePath = path.join(bicepTemplateDir, Bicep.ProvisionFileName);
    const moduleProvisionFilePath = path.join(
      bicepTemplateDir,
      FrontendPathInfo.ModuleProvisionFileName
    );
    const provisionOrchestration = await generateBicepFromFile(provisionFilePath, pluginCtx);
    const provisionModules = await generateBicepFromFile(moduleProvisionFilePath, pluginCtx);

    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { frontendHosting: provisionModules },
      },
      Reference: {
        endpoint: FrontendOutputBicepSnippet.Endpoint,
        domain: FrontendOutputBicepSnippet.Domain,
      },
    };
    return ok({ kind: "bicep", template: result });
  }
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath,
    envInfo?: v3.EnvInfoV3
  ): Promise<Result<v2.ResourceTemplate | undefined, FxError>> {
    const scaffoldRes = await this.scaffold(ctx, inputs);
    if (scaffoldRes.isErr()) return err(scaffoldRes.error);
    const armRes = await this.generateResourceTemplate(ctx, inputs);
    if (armRes.isErr()) return err(armRes.error);
    return ok(armRes.value);
  }
  // afterOtherFeaturesAdded?;
  // getQuestionsForProvision?: ((ctx: Context, inputs: Inputs, tokenProvider: TokenProvider, envInfo?: DeepReadonly<...> | undefined) => Promise<...>) | undefined;
  // provisionResource?: ((ctx: Context, inputs: InputsWithProjectPath, envInfo: v3.EnvInfoV3, tokenProvider: TokenProvider) => Promise<...>) | undefined;
  // configureResource?: ((ctx: Context, inputs: InputsWithProjectPath, envInfo: v3.EnvInfoV3, tokenProvider: TokenProvider) => Promise<...>) | undefined;
  // getQuestionsForDeploy?: ((ctx: Context, inputs: Inputs, tokenProvider: TokenProvider, envInfo?: DeepReadonly<...> | undefined) => Promise<...>) | undefined;
  // deploy?: ((ctx: Context, inputs: InputsWithProjectPath, envInfo: DeepReadonly<v3.EnvInfoV3>, tokenProvider: AzureAccountProvider) => Promise<...>) | undefined;
}

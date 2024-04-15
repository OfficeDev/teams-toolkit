// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Context, FxError, Inputs, Result, err, ok } from "@microsoft/teamsfx-api";
import { TelemetryEvent, TelemetryProperty } from "../../../common/telemetry";
import { convertToAlphanumericOnly } from "../../../common/utils";
import { ProgressMessages, ProgressTitles } from "../../messages";
import { ActionContext, ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { commonTemplateName, componentName } from "../constant";
import { enableTestToolByDefault, isNewProjectTypeEnabled } from "../../../common/featureFlags";
import {
  CapabilityOptions,
  MeArchitectureOptions,
  ProgrammingLanguage,
  QuestionNames,
} from "../../../question";
import { Generator, templateDefaultOnActionError } from "../generator";
import { convertToLangKey, renderTemplateFileData, renderTemplateFileName } from "../utils";
import { merge } from "lodash";
import { GeneratorContext, TemplateActionSeq } from "../generatorAction";
import { TemplateInfo } from "./templateInfo";
import { Feature2TemplateName } from "./templateNames";

export interface TemplateGenerator {
  activate(ctx: Context, inputs: Inputs): boolean;
  run(
    ctx: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>>;
  getTemplateInfos(
    ctx: Context,
    inputs: Inputs,
    actionContext?: ActionContext
  ): Promise<Result<TemplateInfo[], FxError>>;
  post(
    ctx: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>>;
}

export class DefaultTemplateGenerator implements TemplateGenerator {
  componentName = componentName;

  public activate(ctx: Context, inputs: Inputs): boolean {
    return Object.keys(Feature2TemplateName).some((feature) =>
      feature.startsWith(inputs.capabilities)
    );
  }

  public getTemplateInfos(
    ctx: Context,
    inputs: Inputs,
    actionContext?: ActionContext
  ): Promise<Result<TemplateInfo[], FxError>> {
    const templateName = this.getTemplateName(inputs);
    const language = inputs[QuestionNames.ProgrammingLanguage] as ProgrammingLanguage;
    const variables = this.getDefaultReplaceMap(inputs);
    return Promise.resolve(ok([{ templateName, language, variables }]));
  }

  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.create,
      progressSteps: 1,
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.GenerateTemplate,
    }),
  ])
  public async run(
    ctx: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const preResult = await this.getTemplateInfos(ctx, inputs, actionContext);
    if (preResult.isErr()) return err(preResult.error);

    const templateInfos = preResult.value;
    for (const templateInfo of templateInfos) {
      await this.scaffolding(ctx, templateInfo, destinationPath, actionContext);
    }

    const postRes = await this.post(ctx, inputs, destinationPath, actionContext);
    if (postRes.isErr()) return postRes;

    return ok(undefined);
  }

  public post(
    ctx: Context,
    inputs: Inputs,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    return Promise.resolve(ok(undefined));
  }

  public getDefaultReplaceMap(inputs: Inputs): { [key: string]: string } {
    const appName = inputs[QuestionNames.AppName] as string;
    const safeProjectName =
      inputs[QuestionNames.SafeProjectName] ?? convertToAlphanumericOnly(appName);
    const targetFramework = inputs.targetFramework;
    const placeProjectFileInSolutionDir = inputs.placeProjectFileInSolutionDir === "true";
    const llmService: string | undefined = inputs[QuestionNames.LLMService];
    const openAIKey: string | undefined = inputs[QuestionNames.OpenAIKey];
    const azureOpenAIKey: string | undefined = inputs[QuestionNames.AzureOpenAIKey];
    const azureOpenAIEndpoint: string | undefined = inputs[QuestionNames.AzureOpenAIEndpoint];

    return {
      appName: appName,
      ProjectName: appName,
      TargetFramework: targetFramework ?? "net8.0",
      PlaceProjectFileInSolutionDir: placeProjectFileInSolutionDir ? "true" : "",
      SafeProjectName: safeProjectName,
      SafeProjectNameLowerCase: safeProjectName.toLocaleLowerCase(),
      enableTestToolByDefault: enableTestToolByDefault() ? "true" : "",
      useOpenAI: llmService === "llm-service-openai" ? "true" : "",
      useAzureOpenAI: llmService === "llm-service-azure-openai" ? "true" : "",
      openAIKey: openAIKey ?? "",
      azureOpenAIKey: azureOpenAIKey ?? "",
      azureOpenAIEndpoint: azureOpenAIEndpoint ?? "",
      isNewProjectTypeEnabled: isNewProjectTypeEnabled() ? "true" : "",
      NewProjectTypeName: process.env.TEAMSFX_NEW_PROJECT_TYPE_NAME ?? "TeamsApp",
      NewProjectTypeExt: process.env.TEAMSFX_NEW_PROJECT_TYPE_EXTENSION ?? "ttkproj",
    };
  }

  private getTemplateName(inputs: Inputs) {
    const language = inputs[QuestionNames.ProgrammingLanguage];
    const capability = inputs.capabilities as string;
    const meArchitecture = inputs[QuestionNames.MeArchitectureType] as string;
    const apiMEAuthType = inputs[QuestionNames.ApiMEAuth] as string;
    const trigger = inputs[QuestionNames.BotTrigger] as string;
    let feature = `${capability}:${trigger}`;
    if (
      capability === CapabilityOptions.m365SsoLaunchPage().id ||
      capability === CapabilityOptions.m365SearchMe().id
    ) {
      inputs.isM365 = true;
    }

    if (
      language === "csharp" &&
      capability === CapabilityOptions.notificationBot().id &&
      inputs.isIsolated === true
    ) {
      feature += "-isolated";
    }

    if (meArchitecture) {
      feature = `${feature}:${meArchitecture}`;
    }
    if (
      inputs.targetFramework &&
      inputs.targetFramework !== "net6.0" &&
      inputs.targetFramework !== "net7.0" &&
      (capability === CapabilityOptions.nonSsoTab().id || capability === CapabilityOptions.tab().id)
    ) {
      feature = `${capability}:ssr`;
    }

    if (
      capability === CapabilityOptions.m365SearchMe().id &&
      meArchitecture === MeArchitectureOptions.newApi().id
    ) {
      feature = `${feature}:${apiMEAuthType}`;
    }

    if (capability === CapabilityOptions.customCopilotRag().id) {
      feature = `${feature}:${inputs[QuestionNames.CustomCopilotRag] as string}`;
    } else if (capability === CapabilityOptions.customCopilotAssistant().id) {
      feature = `${feature}:${inputs[QuestionNames.CustomCopilotAssistant] as string}`;
    }

    return Feature2TemplateName[feature];
  }

  private async scaffolding(
    ctx: Context,
    templateInfo: TemplateInfo,
    destinationPath: string,
    actionContext?: ActionContext
  ): Promise<void> {
    const name = templateInfo.templateName;
    const language = convertToLangKey(templateInfo.language) ?? commonTemplateName;
    const replaceMap = templateInfo.replaceMap ?? {};
    const filterFn = templateInfo.filterFn ?? (() => true);
    const templateName = `${name}-${language}`;
    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.TemplateName]: templateName,
    });

    const generatorContext: GeneratorContext = {
      name: name,
      language: language,
      destination: destinationPath,
      logProvider: ctx.logProvider,
      fileNameReplaceFn: (fileName, fileData) =>
        renderTemplateFileName(fileName, fileData, replaceMap)
          .replace(/\\/g, "/")
          .replace(`${name}/`, ""),
      fileDataReplaceFn: (fileName, fileData) =>
        renderTemplateFileData(fileName, fileData, replaceMap),
      filterFn: (fileName) =>
        fileName.replace(/\\/g, "/").startsWith(`${name}/`) && filterFn(fileName),
      onActionError: templateDefaultOnActionError,
    };

    await actionContext?.progressBar?.next(ProgressMessages.generateTemplate);
    ctx.logProvider.debug(`Downloading app template "${templateName}" to ${destinationPath}`);
    await Generator.generate(generatorContext, TemplateActionSeq);

    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.Fallback]: generatorContext.fallback ? "true" : "false", // Track fallback cases.
    });
  }
}

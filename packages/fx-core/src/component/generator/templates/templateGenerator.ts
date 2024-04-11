// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Context, FxError, Inputs, Result, err, ok } from "@microsoft/teamsfx-api";
import { TelemetryEvent, TelemetryProperty } from "../../../common/telemetry";
import { convertToAlphanumericOnly } from "../../../common/utils";
import { ProgressMessages, ProgressTitles } from "../../messages";
import { ActionContext, ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { commonTemplateName, componentName, errorSource } from "../constant";
import {
  enableTestToolByDefault,
  isApiKeyEnabled,
  isNewProjectTypeEnabled,
} from "../../../common/featureFlags";
import {
  ApiMessageExtensionAuthOptions,
  CapabilityOptions,
  CustomCopilotAssistantOptions,
  CustomCopilotRagOptions,
  MeArchitectureOptions,
  NotificationTriggerOptions,
  ProgrammingLanguage,
  QuestionNames,
} from "../../../question";
import { Generator, templateDefaultOnActionError } from "../generator";
import { convertToLangKey, renderTemplateFileData, renderTemplateFileName } from "../utils";
import { merge } from "lodash";
import { GeneratorContext, TemplateActionSeq } from "../generatorAction";

export enum TemplateNames {
  Tab = "non-sso-tab",
  SsoTab = "sso-tab",
  TabSSR = "non-sso-tab-ssr",
  SsoTabSSR = "sso-tab-ssr",
  DashboardTab = "dashboard-tab",
  NotificationRestify = "notification-restify",
  NotificationWebApi = "notification-webapi",
  NotificationHttpTrigger = "notification-http-trigger",
  NotificationHttpTriggerIsolated = "notification-http-trigger-isolated",
  NotificationTimerTrigger = "notification-timer-trigger",
  NotificationTimerTriggerIsolated = "notification-timer-trigger-isolated",
  NotificationHttpTimerTrigger = "notification-http-timer-trigger",
  NotificationHttpTimerTriggerIsolated = "notification-http-timer-trigger-isolated",
  CommandAndResponse = "command-and-response",
  Workflow = "workflow",
  DefaultBot = "default-bot",
  MessageExtension = "message-extension",
  MessageExtensionAction = "message-extension-action",
  MessageExtensionSearch = "message-extension-search",
  MessageExtensionCopilot = "message-extension-copilot",
  M365MessageExtension = "m365-message-extension",
  TabAndDefaultBot = "non-sso-tab-default-bot",
  BotAndMessageExtension = "default-bot-message-extension",
  SsoTabObo = "sso-tab-with-obo-flow",
  LinkUnfurling = "link-unfurling",
  CopilotPluginFromScratch = "copilot-plugin-from-scratch",
  CopilotPluginFromScratchApiKey = "copilot-plugin-from-scratch-api-key",
  ApiMessageExtensionSso = "api-message-extension-sso",
  ApiPluginFromScratch = "api-plugin-from-scratch",
  AIBot = "ai-bot",
  AIAssistantBot = "ai-assistant-bot",
  CustomCopilotBasic = "custom-copilot-basic",
  CustomCopilotRagCustomize = "custom-copilot-rag-customize",
  CustomCopilotRagAzureAISearch = "custom-copilot-rag-azure-ai-search",
  CustomCopilotRagCustomApi = "custom-copilot-rag-custom-api",
  CustomCopilotRagMicrosoft365 = "custom-copilot-rag-microsoft365",
  CustomCopilotAssistantNew = "custom-copilot-assistant-new",
  CustomCopilotAssistantAssistantsApi = "custom-copilot-assistant-assistants-api",
}

export interface TemplateInfo {
  templateName: string;
  language: ProgrammingLanguage;
  replaceMap?: { [key: string]: string };
  filterFn?: (fileName: string) => boolean;
}

export const Feature2TemplateName = {
  [`${CapabilityOptions.notificationBot().id}:${NotificationTriggerOptions.appService().id}`]:
    TemplateNames.NotificationRestify,
  [`${CapabilityOptions.notificationBot().id}:${NotificationTriggerOptions.appServiceForVS().id}`]:
    TemplateNames.NotificationWebApi,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsHttpTrigger().id
  }`]: TemplateNames.NotificationHttpTrigger,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsHttpTriggerIsolated().id
  }`]: TemplateNames.NotificationHttpTriggerIsolated,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsTimerTrigger().id
  }`]: TemplateNames.NotificationTimerTrigger,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsTimerTriggerIsolated().id
  }`]: TemplateNames.NotificationTimerTriggerIsolated,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsHttpAndTimerTrigger().id
  }`]: TemplateNames.NotificationHttpTimerTrigger,
  [`${CapabilityOptions.notificationBot().id}:${
    NotificationTriggerOptions.functionsHttpAndTimerTriggerIsolated().id
  }`]: TemplateNames.NotificationHttpTimerTriggerIsolated,
  [`${CapabilityOptions.commandBot().id}:undefined`]: TemplateNames.CommandAndResponse,
  [`${CapabilityOptions.workflowBot().id}:undefined`]: TemplateNames.Workflow,
  [`${CapabilityOptions.basicBot().id}:undefined`]: TemplateNames.DefaultBot,
  [`${CapabilityOptions.collectFormMe().id}:undefined`]: TemplateNames.MessageExtensionAction,
  [`${CapabilityOptions.me().id}:undefined`]: TemplateNames.MessageExtension,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.botMe().id}`]:
    TemplateNames.M365MessageExtension,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.botPlugin().id}`]:
    TemplateNames.MessageExtensionCopilot,
  [`${CapabilityOptions.SearchMe().id}:undefined`]: TemplateNames.MessageExtensionSearch,
  [`${CapabilityOptions.tab().id}:undefined`]: TemplateNames.SsoTab,
  [`${CapabilityOptions.nonSsoTab().id}:undefined`]: TemplateNames.Tab,
  [`${CapabilityOptions.m365SsoLaunchPage().id}:undefined`]: TemplateNames.SsoTabObo,
  [`${CapabilityOptions.dashboardTab().id}:undefined`]: TemplateNames.DashboardTab,
  [`${CapabilityOptions.nonSsoTabAndBot().id}:undefined`]: TemplateNames.TabAndDefaultBot,
  [`${CapabilityOptions.botAndMe().id}:undefined`]: TemplateNames.BotAndMessageExtension,
  [`${CapabilityOptions.linkUnfurling().id}:undefined`]: TemplateNames.LinkUnfurling,
  [`${CapabilityOptions.copilotPluginNewApi().id}:undefined`]: TemplateNames.ApiPluginFromScratch,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.newApi().id}:${
    ApiMessageExtensionAuthOptions.none().id
  }`]: TemplateNames.CopilotPluginFromScratch,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.newApi().id}:${
    ApiMessageExtensionAuthOptions.apiKey().id
  }`]: TemplateNames.CopilotPluginFromScratchApiKey,
  [`${CapabilityOptions.m365SearchMe().id}:undefined:${MeArchitectureOptions.newApi().id}:${
    ApiMessageExtensionAuthOptions.microsoftEntra().id
  }`]: TemplateNames.ApiMessageExtensionSso,
  [`${CapabilityOptions.aiBot().id}:undefined`]: TemplateNames.AIBot,
  [`${CapabilityOptions.aiAssistantBot().id}:undefined`]: TemplateNames.AIAssistantBot,
  [`${CapabilityOptions.tab().id}:ssr`]: TemplateNames.SsoTabSSR,
  [`${CapabilityOptions.nonSsoTab().id}:ssr`]: TemplateNames.TabSSR,
  [`${CapabilityOptions.customCopilotBasic().id}:undefined`]: TemplateNames.CustomCopilotBasic,
  [`${CapabilityOptions.customCopilotRag().id}:undefined:${
    CustomCopilotRagOptions.customize().id
  }`]: TemplateNames.CustomCopilotRagCustomize,
  [`${CapabilityOptions.customCopilotRag().id}:undefined:${
    CustomCopilotRagOptions.azureAISearch().id
  }`]: TemplateNames.CustomCopilotRagAzureAISearch,
  [`${CapabilityOptions.customCopilotRag().id}:undefined:${
    CustomCopilotRagOptions.customApi().id
  }`]: TemplateNames.CustomCopilotRagCustomApi,
  [`${CapabilityOptions.customCopilotRag().id}:undefined:${
    CustomCopilotRagOptions.microsoft365().id
  }`]: TemplateNames.CustomCopilotRagMicrosoft365,
  [`${CapabilityOptions.customCopilotAssistant().id}:undefined:${
    CustomCopilotAssistantOptions.new().id
  }`]: TemplateNames.CustomCopilotAssistantNew,
  [`${CapabilityOptions.customCopilotAssistant().id}:undefined:${
    CustomCopilotAssistantOptions.assistantsApi().id
  }`]: TemplateNames.CustomCopilotAssistantAssistantsApi,
};

export interface IGenerator {
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

export class DefaultTemplateGenerator implements IGenerator {
  componentName = componentName;

  public activate(ctx: Context, inputs: Inputs): boolean {
    return Object.keys(Feature2TemplateName).some((feature) =>
      feature.includes(inputs.capabilities)
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
      if (isApiKeyEnabled() && apiMEAuthType) {
        feature = `${feature}:${apiMEAuthType}`;
      } else {
        feature = `${feature}:none`;
      }
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
    const language = convertToLangKey(templateInfo.language);
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

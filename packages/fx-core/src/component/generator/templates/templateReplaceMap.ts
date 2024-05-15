// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Inputs } from "@microsoft/teamsfx-api";
import {
  enableMETestToolByDefault,
  enableTestToolByDefault,
  isNewProjectTypeEnabled,
} from "../../../common/featureFlags";
import { QuestionNames } from "../../../question";
import { convertToAlphanumericOnly } from "../../../common/stringUtils";

export function getTemplateReplaceMap(inputs: Inputs): { [key: string]: string } {
  const appName = inputs[QuestionNames.AppName] as string;
  const safeProjectName =
    inputs[QuestionNames.SafeProjectName] ?? convertToAlphanumericOnly(appName);
  const targetFramework = inputs.targetFramework;
  const placeProjectFileInSolutionDir = inputs.placeProjectFileInSolutionDir === "true";
  const llmService: string | undefined = inputs[QuestionNames.LLMService];
  const openAIKey: string | undefined = inputs[QuestionNames.OpenAIKey];
  const azureOpenAIKey: string | undefined = inputs[QuestionNames.AzureOpenAIKey];
  const azureOpenAIEndpoint: string | undefined = inputs[QuestionNames.AzureOpenAIEndpoint];
  const azureOpenAIDeploymentName: string | undefined =
    inputs[QuestionNames.AzureOpenAIDeploymentName];

  return {
    appName: appName,
    ProjectName: appName,
    TargetFramework: targetFramework ?? "net8.0",
    PlaceProjectFileInSolutionDir: placeProjectFileInSolutionDir ? "true" : "",
    SafeProjectName: safeProjectName,
    SafeProjectNameLowerCase: safeProjectName.toLocaleLowerCase(),
    enableTestToolByDefault: enableTestToolByDefault() ? "true" : "",
    enableMETestToolByDefault: enableMETestToolByDefault() ? "true" : "",
    useOpenAI: llmService === "llm-service-openai" ? "true" : "",
    useAzureOpenAI: llmService === "llm-service-azure-openai" ? "true" : "",
    openAIKey: openAIKey ?? "",
    azureOpenAIKey: azureOpenAIKey ?? "",
    azureOpenAIEndpoint: azureOpenAIEndpoint ?? "",
    azureOpenAIDeploymentName: azureOpenAIDeploymentName ?? "",
    isNewProjectTypeEnabled: isNewProjectTypeEnabled() ? "true" : "",
    NewProjectTypeName: process.env.TEAMSFX_NEW_PROJECT_TYPE_NAME ?? "TeamsApp",
    NewProjectTypeExt: process.env.TEAMSFX_NEW_PROJECT_TYPE_EXTENSION ?? "ttkproj",
  };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Inputs } from "@microsoft/teamsfx-api";
import { featureFlagManager, FeatureFlags } from "../../../common/featureFlags";
import { convertToAlphanumericOnly } from "../../../common/stringUtils";
import { QuestionNames } from "../../../question/constants";

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
    enableTestToolByDefault: featureFlagManager.getBooleanValue(FeatureFlags.TestTool)
      ? "true"
      : "",
    enableMETestToolByDefault: featureFlagManager.getBooleanValue(FeatureFlags.METestTool)
      ? "true"
      : "",
    useOpenAI: llmService === "llm-service-openai" ? "true" : "",
    useAzureOpenAI: llmService === "llm-service-azure-openai" ? "true" : "",
    openAIKey: openAIKey ?? "",
    azureOpenAIKey: azureOpenAIKey ?? "",
    azureOpenAIEndpoint: azureOpenAIEndpoint ?? "",
    azureOpenAIDeploymentName: azureOpenAIDeploymentName ?? "",
    isNewProjectTypeEnabled: featureFlagManager.getBooleanValue(FeatureFlags.NewProjectType)
      ? "true"
      : "",
    NewProjectTypeName: process.env.TEAMSFX_NEW_PROJECT_TYPE_NAME ?? "TeamsApp",
    NewProjectTypeExt: process.env.TEAMSFX_NEW_PROJECT_TYPE_EXTENSION ?? "ttkproj",
  };
}

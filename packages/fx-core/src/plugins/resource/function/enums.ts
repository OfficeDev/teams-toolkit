// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export enum FunctionLanguage {
  JavaScript = "javascript",
  TypeScript = "typescript",
  // CSharp = "csharp"
}

export enum FunctionConfigKey {
  resourceGroupName = "resourceGroupName",
  subscriptionId = "subscriptionId",
  credential = "credential",
  location = "location",
  resourceNameSuffix = "resourceNameSuffix",
  functionLanguage = "programmingLanguage",

  /* Config exported by Function plugin */
  functionAppName = "functionAppName",
  defaultFunctionName = "defaultFunctionName",
  storageAccountName = "storageAccountName",
  appServicePlanName = "appServicePlanName",
  functionEndpoint = "functionEndpoint",
  functionAppResourceId = "functionAppResourceId",

  /* Intermediate  */
  functionName = "functionName",
  skipDeploy = "skipDeploy",
  site = "site",
}

export enum QuestionKey {
  functionName = "function-name",
  programmingLanguage = "programming-language",
  nodeVersion = "node-version",
  stage = "stage",
}

export enum ResourceType {
  storageAccount = "Azure storage account",
  appServicePlan = "Azure App Service plan",
  functionApp = "Azure function app",
}

export enum TelemetryKey {
  Component = "component",
  Success = "success",
  ErrorType = "error-type",
  ErrorMessage = "error-message",
  ErrorCode = "error-code",
  AppId = "appid",
  OSArch = "os-arch",
  OSRelease = "os-release",
}

export enum TelemetryValue {
  Success = "yes",
  Fail = "no",
  UserError = "user",
  SystemError = "system",
}

export enum FunctionEvent {
  preScaffold = "pre-scaffold",
  scaffold = "scaffold",
  postScaffold = "post-scaffold",
  preProvision = "pre-provision",
  provision = "provision",
  postProvision = "post-provision",
  preDeploy = "pre-deploy",
  deploy = "deploy",
  postDeploy = "post-deploy",
  getQuestions = "get-questions",
  executeUserTask = "execute-user-task",
  callFunc = "call-func",
  scaffoldFallback = "scaffold-fallback",
  skipDeploy = "skip-deploy",
  DeploymentInfoNotFound = "deployment-info-not-found",
  generateArmTemplates = "generate-arm-templates",
  updateArmTemplates = "update-arm-templates",
  addResource = "add-resource",
}

export enum CustomizedTask {
  addResource = "addResource",
  addFeature = "addFeature",
}

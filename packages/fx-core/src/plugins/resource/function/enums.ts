// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export enum FunctionLanguage {
    JavaScript = "JavaScript",
    TypeScript = "TypeScript",
    CSharp = "CSharp"
}

export enum FunctionConfigKey {
    resourceGroupName = "resourceGroupName",
    subscriptionId = "subscriptionId",
    credential = "credential",
    location = "location",
    resourceNameSuffix = "resourceNameSuffix",

    /* Config exported by Function plugin */
    functionLanguage = "functionLanguage",
    functionAppName = "functionAppName",
    defaultFunctionName = "defaultFunctionName",
    storageAccountName = "storageAccountName",
    appServicePlanName = "appServicePlanName",
    functionEndpoint = "functionEndpoint",

    /* States */
    scaffoldDone = "scaffoldDone",
    provisionDone = "provisionDone",

    /* Intermediate  */
    functionName = "functionName",
    skipDeploy = "skipDeploy",
}

export enum QuestionKey {
    functionName = "function-name",
    functionLanguage = "function-language",
    stage = "stage"
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
    ErrorMessage = "error-message"
}

export enum TelemetryValue {
    Success = "yes",
    Fail = "no",
    UserError = "user",
    SystemError = "system"
}

export enum LifeCycle {
    preScaffold = "preScaffold",
    scaffold = "scaffold",
    postScaffold = "postScaffold",
    preProvision = "preProvision",
    provision = "provision",
    postProvision = "postProvision",
    preDeploy = "preDeploy",
    deploy = "deploy",
    postDeploy = "postDeploy",
    getQuestions = "getQuestions",
    callFunc = "callFunc"
}

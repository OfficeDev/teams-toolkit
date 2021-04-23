// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FunctionPluginPathInfo as PathInfo, RegularExpr } from "../constants";

export class InfoMessages {
    public static readonly askNodeVersion: string = "Please select a node version for the Azure function app.";
    public static readonly askFunctionName: string = "Please provide function name.";

    public static readonly checkDotNetVersion: string = "Check .Net Core version.";
    public static readonly buildFunctionComponent: string = "Build API Project.";
    public static readonly dotNetVersionUnexpected = (current: string, expected: string[]) =>
        `The .NET Core version is ${current}, which would be better to be "${expected.join(", ")}", You may get error during deployment.`;

    public static readonly installFunctionExtensions: string = "Installing TeamsFX binding.";
    public static readonly skipDeployment: string =
        "Skip deployment because no change detected. You can remove .deployment folder to force deploy."

    public static readonly getTemplateFrom = (url: string) => `Get template from url: ${url}.`;

    public static readonly projectBaseExists = "Project base exists, only add new function.";
    public static readonly projectScaffoldAt = (basePath: string) => `Project base is scaffolded at ${basePath}.`;
    public static readonly functionScaffoldAt = (functionPath: string) => `Function scaffold write file ${functionPath}.`;
    public static readonly generateStorageAccountName = (name: string) => `Generate Azure storage account name: ${name}.`;
    public static readonly generateAppServicePlanName = (name: string) => `Generate Azure App Service plan name: ${name}.`;
    public static readonly generateFunctionAppName = (name: string) => `Generate Azure function app name: ${name}.`;

    public static readonly checkResource = (resourceType: string, resourceName: string, resourceGroup: string) =>
        `Check resource ${resourceType} with name ${resourceName} under resource group ${resourceGroup}.`;
    public static readonly resourceCreating = "Resource does not exist, creating...";
    public static readonly resourceExists = "Resource exists, skip...";
    public static readonly functionAppConfigIsEmpty = "Azure function app configuration is empty.";
    public static readonly functionAppSettingsUpdated = "Azure function app settings updated.";
    public static readonly functionAppAuthSettingsUpdated = "Azure function app auth settings updated.";
    public static readonly dependPluginDetected = (name: string) => `Found dependent plugin ${name}, updating Azure function app settings.`;

    public static readonly dotnetVersion = (version: string) => `Check dotnet SDK version, found ${version}.`;
    public static readonly uploadZipSize = (size: number) => `Upload zip package with size ${size}B.`;

    public static readonly succeedWithRetry = (op: string, count: number) => `Succeed to ${op} with retry, total trying count is ${count}.`;

    public static readonly reuseZipNotice =
        `Found ${PathInfo.solutionFolderName}/${PathInfo.funcDeploymentFolderName}/${PathInfo.funcDeploymentZipCacheFileName},` +
        " try to incrementally update it. If you get any error after deployment, please delete this zip file and retry deployment.";
}

export class ErrorMessages {
    public static readonly invalidFunctionName: string =
        `Invalid function name, it should start with a letter and only contain letters and numbers. The max length is 127.`;
    public static readonly functionAlreadyExists: string = "This function already exists.";
    public static readonly noFunctionNameGiven: string = "No function name was given by user, scaffold is cancelled.";
    public static readonly failToGetConnectionString: string = "Fail to get storage account connection string.";
    public static readonly failToGetAppServicePlanId: string = "Fail to get app service plan ID.";
    public static readonly failToGetFunctionAppEndpoint: string = "Fail to get Azure function app endpoint.";
    public static readonly failToFindFunctionApp = "Fail to find Azure function app in post-provision.";
    public static readonly failToQueryPublishCred: string = "Fail to query publish credential for deployment.";
}

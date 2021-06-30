// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import { FunctionPluginPathInfo as PathInfo } from "../constants";

export class InfoMessages {
  public static readonly askNodeVersion: string = "Select Node version for the function app.";
  public static readonly askFunctionName: string = "Provide a function name.";

  public static readonly checkDotNetVersion: string = "Check your .NET Core version.";
  public static readonly buildFunctionComponent: string = "Build API Project.";
  public static readonly dotNetVersionUnexpected = (current: string, expected: string[]) =>
    `The installed .NET Core version is '${current}'. We recommend using version '${expected.join(
      ", "
    )}'.`;

  public static readonly installFunctionExtensions: string = "Installing Azure Functions binding.";
  public static readonly noChange: string = "No changes detected since last deployment.";
  public static readonly skipDeployment: string = `Skip deployment of function project for no changes detected. To fully redeploy the function project, please remove the ${path.join(
    PathInfo.solutionFolderName,
    PathInfo.funcDeploymentFolderName
  )} folder and rerun the command.`;
  public static readonly failedToCheckDotnet = (error: Error) =>
    `Failed to check .NET SDK, error = '${error}'`;
  public static readonly failedToInstallDotnet = (error: Error) =>
    `Failed to install .NET SDK, error = '${error}'`;

  public static readonly getTemplateFrom = (url: string) => `Retrieving template from '${url}'.`;

  public static readonly projectScaffoldAt = (basePath: string) =>
    `Project scaffolded at '${basePath}'.`;
  public static readonly functionScaffoldAt = (functionPath: string) =>
    `Function scaffolded at '${functionPath}'.`;
  public static readonly generateStorageAccountName = (name: string) =>
    `Using Azure Storage account name: ${name}.`;
  public static readonly generateAppServicePlanName = (name: string) =>
    `Using Azure App Service plan name: ${name}.`;
  public static readonly generateFunctionAppName = (name: string) =>
    `Using function app name: ${name}.`;

  public static readonly checkResource = (
    resourceType: string,
    resourceName: string,
    resourceGroup: string
  ) =>
    `Check resource '${resourceType}' with name '${resourceName}' under resource group '${resourceGroup}'.`;
  public static readonly resourceCreating = "Resource does not exist. Creating...";
  public static readonly resourceExists = "Resource exists. Skipping...";
  public static readonly functionAppConfigIsEmpty = "Function app configuration is empty.";
  public static readonly functionAppSettingsUpdated = "Function app settings updated.";
  public static readonly functionAppAuthSettingsUpdated = "Function app auth settings updated.";
  public static readonly dependPluginDetected = (name: string) =>
    `Found dependent plugin '${name}'; updating function app settings.`;

  public static readonly dotnetVersion = (version: string) => `Found .NET SDK version ${version}.`;
  public static readonly uploadZipSize = (size: number) => `Upload zip package (${size}B).`;

  public static readonly succeedWithRetry = (op: string, count: number) =>
    `Successfully completed '${op}'. Retry count is ${count}.`;

  public static readonly reuseZipNotice =
    `Found '${PathInfo.solutionFolderName}/${PathInfo.funcDeploymentFolderName}/${PathInfo.funcDeploymentZipCacheFileName}',` +
    ". If there are errors after deployment, delete this file and retry.";
}

export class ErrorMessages {
  public static readonly invalidFunctionName: string = `Invalid function name. Function names can only contain alphanumerical characters. The max length is 127 characters.`;
  public static readonly functionAlreadyExists: string = "Function already exists.";
  public static readonly noFunctionNameGiven: string = "No function name was specified.";
  public static readonly failToGetConnectionString: string =
    "Failed to retrieve Azure Storage account connection string.";
  public static readonly failToGetAppServicePlanId: string =
    "Failed to retrieve Azure App Service plan ID.";
  public static readonly failToGetFunctionAppEndpoint: string =
    "Failed to retrieve function app endpoint.";
  public static readonly failToFindFunctionApp = "Failed to find function app.";
  public static readonly failToQueryPublishCred: string = "Failed to find publish credential.";
}

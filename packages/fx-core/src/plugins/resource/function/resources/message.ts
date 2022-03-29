// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { FunctionPluginPathInfo as PathInfo } from "../constants";

export class InfoMessages {
  public static readonly askNodeVersion: string = getLocalizedString(
    "plugins.function.askNodeVersion"
  );
  public static readonly askFunctionName: string = getLocalizedString(
    "plugins.function.askFunctionName"
  );

  public static readonly checkDotNetVersion: string = getLocalizedString(
    "plugins.function.checkDotNetVersion"
  );
  public static readonly buildFunctionComponent: string = getLocalizedString(
    "plugins.function.buildFunctionComponent"
  );
  public static readonly dotNetVersionUnexpected = (current: string, expected: string[]) =>
    getLocalizedString("plugins.function.dotNetVersionUnexpected", current, expected.join(", "));

  public static readonly installFunctionExtensions: string = getLocalizedString(
    "plugins.function.installFunctionExtensions"
  );
  public static readonly noChange: string = getLocalizedString("plugins.function.noChange");
  public static readonly skipDeployment: string = getLocalizedString(
    "plugins.function.skipDeployment",
    path.join(PathInfo.solutionFolderName, PathInfo.funcDeploymentFolderName)
  );
  public static readonly failedToInstallDotnet = (error: Error) =>
    getLocalizedString("plugins.function.failedToInstallDotnet", error);

  public static readonly getTemplateFrom = (url: string) =>
    getLocalizedString("plugins.function.getTemplateFrom", url);
  public static readonly getTemplateFromLocal = getLocalizedString(
    "plugins.function.getTemplateFromLocal"
  );

  public static readonly projectScaffoldAt = (basePath: string) =>
    getLocalizedString("plugins.function.projectScaffoldAt", basePath);
  public static readonly functionScaffoldAt = (functionPath: string) =>
    getLocalizedString("plugins.function.functionScaffoldAt", functionPath);
  public static readonly generateStorageAccountName = (name: string) =>
    getLocalizedString("plugins.function.generateStorageAccountName", name);
  public static readonly generateAppServicePlanName = (name: string) =>
    getLocalizedString("plugins.function.generateAppServicePlanName", name);
  public static readonly generateFunctionAppName = (name: string) =>
    getLocalizedString("plugins.function.generateFunctionAppName", name);

  public static readonly ensureResourceProviders = (namespaces: string[], subscriptionId: string) =>
    getLocalizedString(
      "plugins.function.ensureResourceProviders",
      namespaces.join(","),
      subscriptionId
    );

  public static readonly checkResource = (
    resourceType: string,
    resourceName: string,
    resourceGroup: string
  ) =>
    getLocalizedString("plugins.function.checkResource", resourceType, resourceName, resourceGroup);
  public static readonly resourceCreating = getLocalizedString("plugins.function.resourceCreating");
  public static readonly resourceExists = getLocalizedString("plugins.function.resourceExists");
  public static readonly functionAppConfigIsEmpty = getLocalizedString(
    "plugins.function.functionAppConfigIsEmpty"
  );
  public static readonly functionAppSettingsUpdated = getLocalizedString(
    "plugins.function.functionAppSettingsUpdated"
  );
  public static readonly functionAppAuthSettingsUpdated = getLocalizedString(
    "plugins.function.functionAppAuthSettingsUpdated"
  );
  public static readonly dependPluginDetected = (name: string) =>
    getLocalizedString("plugins.function.dependPluginDetected", name);

  public static readonly dotnetVersion = (version: string) =>
    getLocalizedString("plugins.function.dotnetVersion", version);
  public static readonly uploadZipSize = (size: number) =>
    getLocalizedString("plugins.function.uploadZipSize", size);

  public static readonly succeedWithRetry = (op: string, count: number) =>
    getLocalizedString("plugins.function.succeedWithRetry", op, count);

  public static readonly reuseZipNotice = getLocalizedString(
    "plugins.function.reuseZipNotice",
    `'${PathInfo.solutionFolderName}/${PathInfo.funcDeploymentFolderName}/${PathInfo.funcDeploymentZipCacheFileName}'`
  );
}

export class ErrorMessages {
  public static readonly invalidFunctionName: string = getLocalizedString(
    "plugins.function.invalidFunctionName"
  );
  public static readonly functionAlreadyExists: string = getLocalizedString(
    "plugins.function.functionAlreadyExists"
  );
  public static readonly noFunctionNameGiven: string = getLocalizedString(
    "plugins.function.noFunctionNameGiven"
  );
  public static readonly failToGetConnectionString: string = getLocalizedString(
    "plugins.function.failToGetConnectionString"
  );
  public static readonly failToGetAppServicePlanId: string = getLocalizedString(
    "plugins.function.failToGetAppServicePlanId"
  );
  public static readonly failToGetFunctionAppEndpoint: string = getLocalizedString(
    "plugins.function.failToGetFunctionAppEndpoint"
  );
  public static readonly failToFindFunctionApp = getLocalizedString(
    "plugins.function.failToFindFunctionApp"
  );
  public static readonly failToQueryPublishCred: string = getLocalizedString(
    "plugins.function.failToQueryPublishCred"
  );
}

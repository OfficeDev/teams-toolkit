// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Kind, SkuName, SkuTier } from "@azure/arm-storage/esm/models";
import { getAllowedAppIds } from "../../../common/tools";

import { FunctionConfigKey, FunctionLanguage } from "./enums";

export class CommonConstants {
  public static readonly emptyString: string = "";
  public static readonly versionSep: string = ".";
  public static readonly msInOneSecond: number = 1000;
  public static readonly zipTimeMSGranularity: number = 2 * CommonConstants.msInOneSecond;
  public static readonly latestTrustMtime: number = new Date(2000, 1, 1).getTime();
}

export class FunctionPluginInfo {
  public static readonly alias: string = "BE";
  public static readonly pluginName: string = "fx-resource-function";
  public static readonly displayName: string = "Function";
  public static readonly expectDotnetSDKs: string[] = ["3.1", "5.0"];

  public static readonly FunctionPluginPersistentConfig: FunctionConfigKey[] = [
    FunctionConfigKey.functionAppName,
    FunctionConfigKey.storageAccountName,
    FunctionConfigKey.appServicePlanName,
    FunctionConfigKey.functionEndpoint,
    FunctionConfigKey.functionAppResourceId,
  ];

  public static readonly templateBaseGroupName: string = "function-base";
  public static readonly templateBaseScenarioName: string = "default";
  public static readonly templateTriggerGroupName: string = "function-triggers";
}

export class FunctionPluginPathInfo {
  public static readonly solutionFolderName: string = "api";
  public static readonly templateZipExt: string = ".zip";
  public static readonly templateZipNameSep: string = ".";
  public static readonly functionExtensionsFolderName: string = "bin";
  public static readonly functionExtensionsFileName: string = "extensions.csproj";
  public static readonly funcDeploymentFolderName: string = ".deployment";
  public static readonly funcDeploymentInfoFileName: string = "deployment.json";
  public static readonly funcDeploymentZipCacheFileName: string = "deployment.zip";
  public static readonly funcIgnoreFileName: string = ".funcignore";
  public static readonly gitIgnoreFileName: string = ".gitignore";
  public static readonly npmPackageFolderName: string = "node_modules";
}

export class RegularExpr {
  public static readonly validFunctionNamePattern: RegExp = /^[a-zA-Z][\w-]{0,126}$/;
  // See https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules.
  public static readonly validAppServicePlanNamePattern: RegExp = /^[a-zA-Z0-9\-]{1,40}$/;
  public static readonly validFunctionAppNamePattern: RegExp =
    /^[a-zA-Z0-9][a-zA-Z0-9\-]{0,58}[a-zA-Z0-9]$/;
  public static readonly validStorageAccountNamePattern: RegExp = /^[a-z0-9]{3,24}$/;
  public static readonly validResourceSuffixPattern: RegExp = /[0-9a-z]{1,16}/;
  public static readonly allCharToBeSkippedInName: RegExp = /[^a-zA-Z0-9]/g;
  public static readonly replaceTemplateExtName: RegExp = /\.tpl$/;
  public static readonly replaceTemplateFileNamePlaceholder: RegExp = /entryname/g;
}

export class DefaultValues {
  public static readonly helpLink: string = "";
  public static readonly issueLink: string = "https://github.com/OfficeDev/TeamsFx/issues/new";
  public static readonly functionName: string = "getUserProfile";
  public static readonly functionLanguage: FunctionLanguage = FunctionLanguage.JavaScript;
  public static readonly functionTriggerType: string = "HTTPTrigger";
  public static readonly maxTryCount: number = 3;
  public static readonly scaffoldTryCount: number = 1;
  public static readonly scaffoldTimeoutInMs: number = 10 * 1000;
  public static readonly deployTimeoutInMs: number = 10 * 60 * 1000;
}

export class DependentPluginInfo {
  public static readonly solutionPluginFullName = "fx-solution-azure";
  public static readonly solutionPluginName = "solution";
  public static readonly resourceGroupName: string = "resourceGroupName";
  public static readonly subscriptionId: string = "subscriptionId";
  public static readonly resourceNameSuffix: string = "resourceNameSuffix";
  public static readonly location: string = "location";
  public static readonly programmingLanguage: string = "programmingLanguage";
  public static readonly remoteTeamsAppId = "remoteTeamsAppId";

  public static readonly aadPluginName: string = "fx-resource-aad-app-for-teams";
  public static readonly aadClientId: string = "clientId";
  public static readonly aadClientSecret: string = "clientSecret";
  public static readonly oauthHost: string = "oauthHost";
  public static readonly tenantId: string = "tenantId";
  public static readonly applicationIdUris: string = "applicationIdUris";

  public static readonly sqlPluginName: string = "fx-resource-azure-sql";
  public static readonly databaseName: string = "databaseName";
  public static readonly sqlEndpoint: string = "sqlEndpoint";

  public static readonly identityPluginName: string = "fx-resource-identity";
  public static readonly identityClientId: string = "identityClientId";
  public static readonly identityResourceId: string = "identityResourceId";

  public static readonly frontendPluginName: string = "fx-resource-frontend-hosting";
  public static readonly frontendEndpoint: string = "endpoint";
  public static readonly frontendDomain: string = "domain";

  public static readonly apimPluginName: string = "fx-resource-apim";
  public static readonly apimAppId: string = "apimClientAADClientId";
}

export class FunctionAppSettingKeys {
  public static readonly clientId: string = "M365_CLIENT_ID";
  public static readonly clientSecret: string = "M365_CLIENT_SECRET";
  public static readonly oauthHost: string = "M365_AUTHORITY_HOST";
  public static readonly tenantId: string = "M365_TENANT_ID";
  public static readonly identityId: string = "IDENTITY_ID";
  public static readonly databaseName: string = "SQL_DATABASE_NAME";
  public static readonly sqlEndpoint: string = "SQL_ENDPOINT";
  public static readonly allowedAppIds: string = "ALLOWED_APP_IDS";
  public static readonly functionEndpoint: string = "API_ENDPOINT";
  public static readonly applicationIdUris: string = "M365_APPLICATION_ID_URI";
}

export class DefaultProvisionConfigs {
  public static readonly allowAppIdSep = ";";
  public static readonly nameSuffix = "be";
  public static readonly siteIdentityTypeUserAssigned = "UserAssigned";

  public static readonly appServicePlansConfig = (location: string) => ({
    location: location,
    kind: "functionapp",
    sku: {
      name: "Y1",
      tier: "Dynamic",
      size: "Y1",
      family: "Y",
      capacity: 0,
    },
  });

  public static readonly functionAppStaticSettings: { [key: string]: string } = {
    ALLOWED_APP_IDS: getAllowedAppIds().join(";"),
    FUNCTIONS_EXTENSION_VERSION: "~3",
    WEBSITE_RUN_FROM_PACKAGE: "1",
  };

  public static readonly storageConfig = (location: string) => ({
    sku: {
      name: "Standard_LRS" as SkuName,
      tier: "Standard" as SkuTier,
    },
    kind: "StorageV2" as Kind,
    location: location,
    enableHttpsTrafficOnly: true,
  });

  public static readonly functionAppConfig = (location: string) => ({
    kind: "functionapp",
    location: location,
    clientAffinityEnabled: false,
  });
}

export class AzureInfo {
  public static readonly resourceNameLenMax: number = 24;
  public static readonly suffixLenMax: number = 12;
  public static readonly zipDeployURL = (functionAppName: string) =>
    `https://${functionAppName}.scm.azurewebsites.net/api/zipdeploy`;
  public static readonly runFromPackageSettingKey = "WEBSITE_RUN_FROM_PACKAGE";
  public static readonly runFromPackageEnabled = "1";
  public static readonly requiredResourceProviders = ["Microsoft.Web", "Microsoft.Storage"];
}

export class Commands {
  public static readonly npmInstall: string = "npm install";
  public static readonly npmInstallProd: string = "npm install --only=prod";
  public static readonly npmBuild: string = "npm run build";
}

export class QuestionValidationFunc {
  public static readonly validateFunctionName: string = "validateFunctionName";
}

export class FunctionBicep {
  static readonly functionEndpoint: string =
    "provisionOutputs.functionOutput.value.functionEndpoint";
  static readonly functionAppResourceId: string =
    "provisionOutputs.functionOutput.value.functionAppResourceId";
}

export class FunctionArmOutput {
  static readonly Endpoint: string = "function_functionEndpoint";
  static readonly AppResourceId: string = "function_appResourceId";
}

export class FunctionBicepFile {
  static readonly provisionModuleTemplateFileName: string = "functionProvision.template.bicep";
  static readonly configuraitonTemplateFileName: string = "functionConfiguration.template.bicep";
}

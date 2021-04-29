// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";

export class Constants {
    static AzureStorageDefaultTier = "Standard";
    static AzureStorageDefaultSku = "Standard_LRS";
    static AzureStorageDefaultKind = "StorageV2";
    static AzureStorageAccountNameLenMax = 24;
    static AzureStorageWebContainer = "$web";

    static FrontendIndexDocument = "index.html";
    static FrontendErrorDocument = "index.html";
    static FrontendAppNamePattern = /[^a-zA-Z0-9]/g;
    static FrontendStorageNamePattern = /^[a-z0-9]{1,16}fe[a-z0-9]{6}$/;
    static ReplaceTemplateExt = /\.tpl$/;
    static FrontendSuffix = "fe";

    static EmptyString = "";
    static EmptyListString = "[]";

    static DayInMS = 1000 * 60 * 60 * 24;
    static SasTokenLifetime = Constants.DayInMS * 3;

    static RequestRetryTimes = 3;
    static RequestTimeoutInMS = 20 * 1000;
}

export class FrontendPluginInfo {
    static PluginName = "Tab Frontend plugin";
    static DisplayName = "Tab Frontend";
    static ShortName = "FE";
    static IssueLink = ""; // TODO: default issue link
    static HelpLink = ""; // TODO: default help link
    static readonly templateManifestURL =
        "https://github.com/henzhang-ms/Teams-Templates/releases/latest/download/manifest.json";
}

export class Commands {
    static InstallNodePackages = "npm install";
    static BuildFrontend = "npm run build";
}

export class EnvironmentVariables {
    static FuncEndpoint = "REACT_APP_FUNC_ENDPOINT";
    static FuncName = "REACT_APP_FUNC_NAME";
    static RuntimeEndpoint = "REACT_APP_TEAMSFX_ENDPOINT";
    static StartLoginPage = "REACT_APP_START_LOGIN_PAGE_URL";
    static ClientID = "REACT_APP_CLIENT_ID";
}

export class FrontendPathInfo {
    static WorkingDir = "tabs";
    static TemplateDir = path.join(
        "templates",
        "plugins",
        "resource",
        "frontend"
    );
    static RootDir = path.join(__dirname, "..", "..", "..", "..");
    static TemplateFileExt = ".tpl";
    static TemplatePackageExt = ".zip";
    static BuildFolderName = "build";
    static BuildPath = `${FrontendPathInfo.BuildFolderName}${path.sep}`;
    static TabEnvironmentFilePath = ".env";
    static npmPackageFolderName = "node_modules";
    static TabDeploymentFolderName = ".deployment";
    static TabDeploymentInfoFileName = "deployment.json";
    static TabDeployIgnoreFolder = [
        FrontendPathInfo.BuildFolderName,
        FrontendPathInfo.npmPackageFolderName,
        FrontendPathInfo.TabDeploymentFolderName,
    ];
}

export class DependentPluginInfo {
    static readonly SolutionPluginName = "solution";
    static readonly SubscriptionId = "subscriptionId";
    static readonly ResourceGroupName = "resourceGroupName";
    static readonly ResourceNameSuffix = "resourceNameSuffix";
    static readonly Location = "location";
    static readonly ProgrammingLanguage = "programmingLanguage";

    static readonly FunctionPluginName = "fx-resource-function";
    static readonly FunctionEndpoint = "functionEndpoint";
    static readonly FunctionDefaultName = "defaultFunctionName";

    static readonly RuntimePluginName = "fx-resource-simple-auth";
    static readonly RuntimeEndpoint = "endpoint";
    static readonly StartLoginPageURL = "auth-start.html";

    static readonly AADPluginName = "fx-resource-aad-app-for-teams";
    static readonly ClientID = "clientId";

    static readonly LocalDebugPluginName = "fx-resource-local-debug";
    static readonly LocalTabEndpoint = "localTabEndpoint";
}

export class FrontendConfigInfo {
    static readonly StorageName = "storageName";
    static readonly Endpoint = "endpoint";
    static readonly Hostname = "domain";
    static readonly StaticTab = "staticTabs";
    static readonly ConfigurableTab = "configurableTabs";
}

export class TelemetryEvent {
    static readonly startSuffix = "-start";

    static readonly scaffold = "scaffold";

    static readonly PreProvision = "pre-provision";
    static readonly Provision = "provision";
    static readonly PostProvision = "post-provision";

    static readonly PreDeploy = "pre-deploy";
    static readonly Deploy = "deploy";

    static readonly postLocalDebug = "post-local-debug";
}

export class TelemetryKey {
    static readonly Component = "component";
    static readonly Success = "success";
    static readonly ErrorType = "error-type";
    static readonly ErrorMessage = "error-message";
}

export class TelemetryValue {
    static readonly Success = "yes";
    static readonly Fail = "no";
    static readonly UserError = "user";
    static readonly SystemError = "system";
}

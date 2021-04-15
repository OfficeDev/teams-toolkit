// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { StepHelper } from "../utils/step-helper";

export enum ScaffoldSteps {
    ensureFunctionAppProject = "Check/Scaffold api project base",
    scaffoldFunction = "Scaffold function"
}

export enum ProvisionSteps {
    ensureStorageAccount = "Check/Create storage account for Azure function app.",
    getConnectionString = "Query connection string for Azure function app.",
    ensureAppServicePlans = "Check/Create app services plan for Azure function app.",
    ensureFunctionApp = "Check/Create Azure function app."
}

export enum PostProvisionSteps {
    findFunctionApp = "Query Azure function app settings.",
    updateFunctionSettings = "Update Azure function app settings.",
    updateFunctionAuthSettings = "Update Azure function app auth settings."
}

export enum PreDeploySteps {
    dotnetInstall = "Install .NET Core SDK if needed.",
    installTeamsfxBinding = "Install TeamsFX Binding.",
    npmPrepare = "Install/Build js files."
}

export enum DeploySteps {
    generateZip = "Generate zip package.",
    fetchCredential = "Fetch deploy credential.",
    checkFuncAppSettings = "Check Azure function app deploy settings.",
    deploy = "Upload zip package.",
    restart = "Restart Azure function app.",
    syncTrigger = "Sync Triggers for Azure function app."
}

export enum StepGroup {
    ScaffoldStepGroup = "Scaffold Backend API",
    ProvisionStepGroup = "Create Azure Functions resources",
    PostProvisionStepGroup = "Configure Azure function app",
    PreDeployStepGroup = "Prepare local files for deployment",
    DeployStepGroup = "Deploy to Azure function app"
}

export class StepHelperFactory {
    public static scaffoldStepHelper: StepHelper =
    new StepHelper(StepGroup.ScaffoldStepGroup);

    public static provisionStepHelper: StepHelper =
        new StepHelper(StepGroup.ProvisionStepGroup);

    public static postProvisionStepHelper: StepHelper =
        new StepHelper(StepGroup.PostProvisionStepGroup);

    public static preDeployStepHelper: StepHelper =
        new StepHelper(StepGroup.PreDeployStepGroup);

    public static deployStepHelper: StepHelper =
        new StepHelper(StepGroup.DeployStepGroup);

    public static StepRegistry = new Map<string, StepHelper>([
        [StepGroup.ScaffoldStepGroup, StepHelperFactory.scaffoldStepHelper],
        [StepGroup.ProvisionStepGroup, StepHelperFactory.provisionStepHelper],
        [StepGroup.PostProvisionStepGroup, StepHelperFactory.postProvisionStepHelper],
        [StepGroup.PreDeployStepGroup, StepHelperFactory.preDeployStepHelper],
        [StepGroup.DeployStepGroup, StepHelperFactory.deployStepHelper],
    ]);
}

export async function step<T>(group: StepGroup, message: string, fn: () => T | Promise<T>) : Promise<T> {
    await StepHelperFactory.StepRegistry.get(group)?.forward(message);
    return Promise.resolve(fn());
}

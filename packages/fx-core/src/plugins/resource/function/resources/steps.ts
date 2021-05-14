// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { StepHelper } from "../utils/step-helper";

export enum ScaffoldSteps {
  ensureFunctionAppProject = "Setting up project",
  scaffoldFunction = "Scaffolding function",
}

export enum ProvisionSteps {
  ensureStorageAccount = "Setting up storage account.",
  getConnectionString = "Retrieving connection string.",
  ensureAppServicePlans = "Setting up Azure App Services plan.",
  ensureFunctionApp = "Setting up function app.",
}

export enum PostProvisionSteps {
  findFunctionApp = "Retrieving settings.",
  updateFunctionSettings = "Updating settings.",
  updateFunctionAuthSettings = "Updating auth settings.",
}

export enum PreDeploySteps {
  dotnetInstall = "Installing .NET Core SDK if needed.",
  installTeamsfxBinding = "Installing TeamsFX Binding.",
  npmPrepare = "Preparing JS files.",
}

export enum DeploySteps {
  generateZip = "Generating zip package.",
  fetchCredential = "Retrieving deploy credentials.",
  checkFuncAppSettings = "Checking deploy settings.",
  deploy = "Uploading zip package.",
  restart = "Restarting function app.",
  syncTrigger = "Syncing triggers.",
}

export enum StepGroup {
  ScaffoldStepGroup = "Scaffolding function app",
  ProvisionStepGroup = "Provisioning function app",
  PostProvisionStepGroup = "Configuring function app",
  PreDeployStepGroup = "Preparing function app for deployment",
  DeployStepGroup = "Deploying function app",
}

export class StepHelperFactory {
  public static scaffoldStepHelper: StepHelper = new StepHelper(StepGroup.ScaffoldStepGroup);

  public static provisionStepHelper: StepHelper = new StepHelper(StepGroup.ProvisionStepGroup);

  public static postProvisionStepHelper: StepHelper = new StepHelper(
    StepGroup.PostProvisionStepGroup
  );

  public static preDeployStepHelper: StepHelper = new StepHelper(StepGroup.PreDeployStepGroup);

  public static deployStepHelper: StepHelper = new StepHelper(StepGroup.DeployStepGroup);

  public static StepRegistry = new Map<string, StepHelper>([
    [StepGroup.ScaffoldStepGroup, StepHelperFactory.scaffoldStepHelper],
    [StepGroup.ProvisionStepGroup, StepHelperFactory.provisionStepHelper],
    [StepGroup.PostProvisionStepGroup, StepHelperFactory.postProvisionStepHelper],
    [StepGroup.PreDeployStepGroup, StepHelperFactory.preDeployStepHelper],
    [StepGroup.DeployStepGroup, StepHelperFactory.deployStepHelper],
  ]);
}

export async function step<T>(
  group: StepGroup,
  message: string,
  fn: () => T | Promise<T>
): Promise<T> {
  await StepHelperFactory.StepRegistry.get(group)?.forward(message);
  return Promise.resolve(fn());
}

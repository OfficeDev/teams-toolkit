// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ResourceManagementClient,
  DeploymentOperation,
  Deployment,
  DeploymentMode,
} from "@azure/arm-resources";
import {
  AzureAccountProvider,
  ConfigFolderName,
  EnvInfo,
  EnvNamePlaceholder,
  err,
  FxError,
  LogProvider,
  ok,
  ProjectSettingsV3,
  Result,
  SolutionContext,
  SystemError,
  TelemetryReporter,
  UserError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import os from "os";
import path from "path";
import {
  TEAMS_FX_RESOURCE_ID_KEY,
  SolutionError,
  SolutionSource,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  SolutionTelemetrySuccess,
} from "./constants";
import { ConstantString, HelpLinks, PluginDisplayName } from "../common/constants";
import { executeCommand } from "../common/cpUtils";
import {
  compileHandlebarsTemplateString,
  getResourceGroupNameFromResourceId,
  getSubscriptionIdFromResourceId,
  getUuid,
  waitSeconds,
} from "../common/tools";
import { ensureBicep } from "./utils/depsChecker/bicepChecker";
import { ProgressHelper } from "./utils/progressHelper";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { convertManifestTemplateToV3, pluginName2ComponentName } from "../component/migrate";
import { getProjectTemplatesFolderPath } from "../common/utils";
import { InvalidAzureCredentialError } from "../error/azure";

const bicepOrchestrationFileName = "main.bicep";
const configsFolder = `.${ConfigFolderName}/configs`;
const parameterFileNameTemplate = `azure.parameters.${EnvNamePlaceholder}.json`;
const pollWaitSeconds = 10;
const maxRetryTimes = 4;

// constant string
const resourceBaseName = "resourceBaseName";
const parameterName = "parameters";
const solutionName = "solution";

const ErrorCodes: { [key: string]: string } = {
  InvalidTemplate: SolutionError.FailedToValidateArmTemplates,
  InvalidTemplateDeployment: SolutionError.FailedToValidateArmTemplates,
  ResourceGroupNotFound: SolutionError.ResourceGroupNotFound,
};

export type DeployContext = {
  ctx: SolutionContext;
  finished: boolean;
  client: ResourceManagementClient;
  resourceGroupName: string;
  deploymentStartTime: number;
  deploymentName: string;
};

type OperationStatus = {
  resourceName: string;
  resourceGroupName: string;
  subscriptionId: string;
  resourceType?: string;
  status: string;
};

class DeploymentErrorMessage {
  value: string;
  constructor(value: string) {
    this.value = value;
  }
}

export function getRequiredOperation(
  operation: DeploymentOperation,
  deployCtx: DeployContext
): OperationStatus | undefined {
  if (
    operation.properties?.targetResource?.resourceName &&
    operation.properties?.targetResource?.id &&
    operation.properties.provisioningState &&
    operation.properties?.timestamp &&
    operation.properties.timestamp.getTime() > deployCtx.deploymentStartTime
  ) {
    try {
      const resourceGroupName = getResourceGroupNameFromResourceId(
        operation.properties.targetResource.id
      );
      const subscriptionId = getSubscriptionIdFromResourceId(
        operation.properties.targetResource.id
      );
      return {
        resourceName: operation.properties?.targetResource?.resourceName,
        resourceGroupName: resourceGroupName,
        subscriptionId: subscriptionId,
        resourceType: operation.properties.targetResource.resourceType,
        status: operation.properties.provisioningState,
      };
    } catch (error) {
      return undefined;
    }
  } else {
    return undefined;
  }
}

export async function pollDeploymentStatus(deployCtx: DeployContext) {
  let tryCount = 0;
  let previousStatus: { [key: string]: string } = {};
  let polledOperations: string[] = [];
  deployCtx.ctx.logProvider?.info(
    getLocalizedString(
      "core.deployArmTemplates.PollDeploymentStatusNotice",
      PluginDisplayName.Solution
    )
  );
  while (!deployCtx.finished) {
    await waitSeconds(pollWaitSeconds);
    try {
      const operations = [];
      for await (const page of deployCtx.client.deploymentOperations
        .list(deployCtx.resourceGroupName, deployCtx.deploymentName)
        .byPage({ maxPageSize: 100 })) {
        for (const deploymentOperation of page) {
          operations.push(deploymentOperation);
        }
      }

      if (deployCtx.finished) {
        return;
      }

      const currentStatus: { [key: string]: string } = {};
      await Promise.all(
        operations.map(async (o) => {
          const operation = getRequiredOperation(o, deployCtx);
          if (operation) {
            currentStatus[operation.resourceName] = operation.status;
            if (!polledOperations.includes(operation.resourceName)) {
              polledOperations.push(operation.resourceName);
              // get sub operations when resource type is deployments.
              if (operation.resourceType === ConstantString.DeploymentResourceType) {
                let client = deployCtx.client;
                if (operation.subscriptionId !== deployCtx.client.subscriptionId) {
                  const azureToken =
                    await deployCtx.ctx.azureAccountProvider?.getIdentityCredentialAsync();
                  client = new ResourceManagementClient(azureToken!, operation.subscriptionId);
                }

                const subOperations = [];
                for await (const page of client.deploymentOperations
                  .list(operation.resourceGroupName, operation.resourceName)
                  .byPage({ maxPageSize: 100 })) {
                  for (const subOperation of page) {
                    subOperations.push(subOperation);
                  }
                }
                subOperations.forEach((sub) => {
                  const subOperation = getRequiredOperation(sub, deployCtx);
                  if (subOperation) {
                    currentStatus[subOperation.resourceName] = subOperation.status;
                  }
                });
              }
            }
          }
        })
      );

      for (const key in currentStatus) {
        if (currentStatus[key] !== previousStatus[key]) {
          deployCtx.ctx.logProvider?.info(
            `[${PluginDisplayName.Solution}] ${key} -> ${currentStatus[key]}`
          );
        }
      }
      previousStatus = currentStatus;
      polledOperations = [];
    } catch (error) {
      tryCount++;
      if (tryCount < maxRetryTimes) {
        deployCtx.ctx.logProvider?.warning(
          getLocalizedString(
            "core.deployArmTemplates.RetryGetDeploymentStatus",
            deployCtx.deploymentName,
            tryCount
          )
        );
      } else if (tryCount === maxRetryTimes) {
        const pollError = new SystemError({
          error,
          source: SolutionSource,
          name: SolutionError.FailedToPollArmDeploymentStatus,
        });
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.ArmDeployment,
          pollError,
          deployCtx.ctx.telemetryReporter
        );
      }
    }
  }
}

export async function doDeployArmTemplatesV3(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  azureAccountProvider: AzureAccountProvider
): Promise<Result<undefined, FxError>> {
  const progressHandler = await ProgressHelper.startDeployArmTemplatesProgressHandler(
    ctx.userInteraction
  );
  await progressHandler?.next(
    getLocalizedString("core.deployArmTemplates.Progress.ExecuteDeployment")
  );

  // update parameters
  const parameterJson = await getParameterJsonV3(ctx, inputs.projectPath, envInfo);
  const envState = envInfo.state as v3.TeamsFxAzureResourceStates;
  const resourceGroupName = envState.solution.resourceGroupName;
  if (!resourceGroupName) {
    return err(
      new SystemError(
        SolutionSource,
        "NoResourceGroupFound",
        getDefaultString("core.deployArmTemplates.FailedToReadResourceGroup"),
        getLocalizedString("core.deployArmTemplates.FailedToReadResourceGroup")
      )
    );
  }

  const bicepCommand = await ensureBicep(ctx, inputs);

  // Compile bicep file to json
  const templateDir = path.join(await getProjectTemplatesFolderPath(inputs.projectPath), "azure");
  const bicepOrchestrationFilePath = path.join(templateDir, bicepOrchestrationFileName);
  const armTemplateJson = await compileBicepToJson(
    bicepCommand,
    bicepOrchestrationFilePath,
    ctx.logProvider
  );
  ctx.logProvider?.info(
    getLocalizedString(
      "core.deployArmTemplates.CompileBicepSuccessNotice",
      PluginDisplayName.Solution
    )
  );

  // deploy arm templates to azure
  const client = await getResourceManagementClientForArmDeployment(
    azureAccountProvider,
    envState.solution.subscriptionId
  );
  const deploymentName = `${PluginDisplayName.Solution}_deployment`.replace(" ", "_").toLowerCase();
  const deploymentParameters: Deployment = {
    properties: {
      parameters: parameterJson.parameters,
      template: armTemplateJson as any,
      mode: "Incremental" as DeploymentMode,
    },
  };

  const deployCtx: DeployContext = {
    ctx: ctx as any as SolutionContext,
    finished: false,
    deploymentStartTime: Date.now(),
    client: client,
    resourceGroupName: resourceGroupName,
    deploymentName: deploymentName,
  };

  try {
    const result = client.deployments
      .beginCreateOrUpdateAndWait(resourceGroupName, deploymentName, deploymentParameters)
      .then((result) => {
        ctx.logProvider?.info(
          getLocalizedString(
            "core.deployArmTemplates.SuccessNotice",
            PluginDisplayName.Solution,
            resourceGroupName,
            deploymentName
          )
        );
        syncArmOutput(envInfo, result.properties?.outputs);
        return result;
      })
      .finally(() => {
        deployCtx.finished = true;
      });

    await pollDeploymentStatus(deployCtx);
    await result;
    return ok(undefined);
  } catch (error) {
    return handleArmDeploymentError(error, deployCtx);
  }
}

function fetchInnerError(error: any): any {
  if (!error.details) {
    return error;
  }
  if (error.details.error) {
    return fetchInnerError(error.details.error);
  } else if (error.details instanceof Array && error.details[0]) {
    return fetchInnerError(error.details[0]);
  }
  return error;
}

export async function handleArmDeploymentError(
  error: any,
  deployCtx: DeployContext
): Promise<Result<undefined, FxError>> {
  // return the error if the template is invalid
  if (Object.keys(ErrorCodes).includes(error.code)) {
    if (error.code === "InvalidTemplateDeployment") {
      error = fetchInnerError(error);
    }
    return err(
      new UserError({
        error,
        source: SolutionSource,
        name: ErrorCodes[error.code] ?? SolutionError.FailedToValidateArmTemplates,
      })
    );
  }

  // try to get deployment error
  const result = await wrapGetDeploymentError(
    deployCtx,
    deployCtx.resourceGroupName,
    deployCtx.deploymentName
  );
  if (result.isOk()) {
    const deploymentError = result.value;

    // return thrown error if deploymentError is empty
    if (!deploymentError) {
      return err(
        new UserError({
          error,
          source: SolutionSource,
          name: SolutionError.FailedToDeployArmTemplatesToAzure,
        })
      );
    }
    const deploymentErrorObj = formattedDeploymentError(deploymentError);
    const deploymentErrorMessage = JSON.stringify(deploymentErrorObj, undefined, 2);
    let errorMessage = getLocalizedString(
      "core.deployArmTemplates.FailNotice",
      PluginDisplayName.Solution,
      deployCtx.resourceGroupName,
      deployCtx.deploymentName
    );
    errorMessage += getLocalizedString(
      "core.deployArmTemplates.DeploymentErrorWithHelplink",
      error.message,
      deploymentErrorMessage,
      HelpLinks.ArmHelpLink
    );
    const notificationMessage = getNotificationMessage(deploymentError, deployCtx.deploymentName);
    const returnError = new UserError({
      message: errorMessage,
      source: SolutionSource,
      name: SolutionError.FailedToDeployArmTemplatesToAzure,
      helpLink: HelpLinks.ArmHelpLink,
      displayMessage: notificationMessage,
    });
    returnError.innerError = new DeploymentErrorMessage(JSON.stringify(deploymentErrorObj));

    return err(returnError);
  } else {
    deployCtx.ctx.logProvider?.info(
      `origin error message is : \n${JSON.stringify(error, undefined, 2)}`
    );
    return result;
  }
}

function syncArmOutput(envInfo: EnvInfo | v3.EnvInfoV3, armOutput: any) {
  if (armOutput instanceof Object) {
    const armOutputKeys = Object.keys(armOutput);
    for (const armOutputKey of armOutputKeys) {
      const moduleOutput = armOutput[armOutputKey].value;

      if (moduleOutput instanceof Object) {
        const moduleOutputKeys = Object.keys(moduleOutput);
        for (const moduleOutputKey of moduleOutputKeys) {
          const pluginOutput = moduleOutput[moduleOutputKey].value;

          if (pluginOutput instanceof Object) {
            let pluginId = pluginOutput[TEAMS_FX_RESOURCE_ID_KEY];
            if (pluginId) {
              pluginId = pluginName2ComponentName(pluginId);
              const pluginOutputKeys = Object.keys(pluginOutput);
              for (const pluginOutputKey of pluginOutputKeys) {
                if (pluginOutputKey != TEAMS_FX_RESOURCE_ID_KEY) {
                  if (envInfo.state instanceof Map) {
                    let configMap = envInfo.state.get(pluginId);
                    if (!configMap) {
                      configMap = new Map<string, any>();
                      envInfo.state.set(pluginId, configMap);
                    }
                    configMap.set(pluginOutputKey, pluginOutput[pluginOutputKey]);
                  } else {
                    if (!envInfo.state[pluginId]) envInfo.state[pluginId] = {};
                    envInfo.state[pluginId][pluginOutputKey] = pluginOutput[pluginOutputKey];
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

export async function deployArmTemplatesV3(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  azureAccountProvider: AzureAccountProvider
): Promise<Result<undefined, FxError>> {
  ctx.logProvider?.info(
    getLocalizedString("core.deployArmTemplates.StartNotice", PluginDisplayName.Solution)
  );
  let result: Result<undefined, FxError>;
  ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.ArmDeploymentStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });
  try {
    result = await doDeployArmTemplatesV3(ctx, inputs, envInfo, azureAccountProvider);
    if (result.isOk()) {
      ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.ArmDeployment, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
      });
    } else {
      const errorProperties: { [key: string]: string } = {};
      // If the innerError is a DeploymentErrorMessage value, we will set it in telemetry.
      if (result.error.innerError && result.error.innerError instanceof DeploymentErrorMessage) {
        errorProperties[SolutionTelemetryProperty.ArmDeploymentError] =
          result.error.innerError.value;
      }
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.ArmDeployment,
        result.error,
        ctx.telemetryReporter,
        errorProperties
      );
    }
  } catch (error) {
    if (error instanceof UserError || error instanceof SystemError) {
      result = err(error);
    } else if (error instanceof Error) {
      result = err(
        new SystemError({
          error,
          source: SolutionSource,
          name: SolutionError.FailedToDeployArmTemplatesToAzure,
        })
      );
    } else {
      result = err(
        new SystemError({
          error,
          source: SolutionSource,
          name: SolutionError.FailedToDeployArmTemplatesToAzure,
        })
      );
    }
    sendErrorTelemetryThenReturnError(
      SolutionTelemetryEvent.ArmDeployment,
      result.error,
      ctx.telemetryReporter
    );
  }
  await ProgressHelper.endDeployArmTemplatesProgress(result.isOk());
  return result;
}

export async function copyParameterJson(
  projectPath: string,
  appName: string,
  targetEnvName: string,
  sourceEnvName: string
) {
  if (!targetEnvName || !sourceEnvName) {
    return;
  }

  const parameterFolderPath = path.join(projectPath, configsFolder);
  const targetParameterFileName = parameterFileNameTemplate.replace(
    EnvNamePlaceholder,
    targetEnvName
  );
  const sourceParameterFileName = parameterFileNameTemplate.replace(
    EnvNamePlaceholder,
    sourceEnvName
  );
  const targetParameterFilePath = path.join(parameterFolderPath, targetParameterFileName);
  const sourceParameterFilePath = path.join(parameterFolderPath, sourceParameterFileName);
  const targetParameterContent = await fs.readJson(sourceParameterFilePath);
  if (targetParameterContent[parameterName]?.provisionParameters?.value?.resourceBaseName) {
    targetParameterContent[parameterName].provisionParameters.value!.resourceBaseName =
      generateResourceBaseName(appName, targetEnvName);
  }

  await fs.ensureDir(parameterFolderPath);
  await fs.writeFile(
    targetParameterFilePath,
    JSON.stringify(targetParameterContent, undefined, 2).replace(/\r?\n/g, os.EOL)
  );
}

export async function updateAzureParameters(
  projectPath: string,
  appName: string,
  envName: string,
  hasSwitchedM365Tenant: boolean,
  hasSwitchedSubscription: boolean,
  hasBotServiceCreatedBefore: boolean
): Promise<Result<undefined, FxError>> {
  if (
    !envName ||
    !appName ||
    !projectPath ||
    (!hasSwitchedM365Tenant && !hasSwitchedSubscription) ||
    (hasSwitchedM365Tenant && !hasBotServiceCreatedBefore)
  ) {
    return ok(undefined);
  }

  const parameterFolderPath = path.join(projectPath, configsFolder);
  const targetParameterFileName = parameterFileNameTemplate.replace(EnvNamePlaceholder, envName);

  const targetParameterFilePath = path.join(parameterFolderPath, targetParameterFileName);

  try {
    const targetParameterContent = await fs.readJson(targetParameterFilePath);

    if (hasSwitchedSubscription) {
      targetParameterContent[parameterName].provisionParameters.value!.resourceBaseName =
        generateResourceBaseName(appName, envName);
    } else if (hasSwitchedM365Tenant && hasBotServiceCreatedBefore) {
      targetParameterContent[parameterName].provisionParameters.value!.botServiceName =
        generateResourceBaseName(appName, envName);
    }
    await fs.ensureDir(parameterFolderPath);
    await fs.writeFile(
      targetParameterFilePath,
      JSON.stringify(targetParameterContent, undefined, 2).replace(/\r?\n/g, os.EOL)
    );
    return ok(undefined);
  } catch (exception) {
    const error = new UserError(
      SolutionSource,
      SolutionError.FailedToUpdateAzureParameters,
      getDefaultString("core.handleConfigFile.FailedToUpdateAzureParameters", envName),
      getLocalizedString("core.handleConfigFile.FailedToUpdateAzureParameters", envName)
    );
    return err(error);
  }
}

export async function getParameterJsonV3(
  ctx: v2.Context,
  projectPath: string,
  envInfo: v3.EnvInfoV3
) {
  if (!envInfo?.envName) {
    throw new Error(getLocalizedString("core.deployArmTemplates.FailedToGetEnvironmentName"));
  }

  const parameterFileName = parameterFileNameTemplate.replace(EnvNamePlaceholder, envInfo.envName);
  const parameterFolderPath = path.join(projectPath, configsFolder);
  const parameterFilePath = path.join(parameterFolderPath, parameterFileName);
  try {
    await fs.stat(parameterFilePath);
  } catch (err) {
    const error = new UserError(
      SolutionSource,
      "ParameterFileNotExist",
      getDefaultString("core.deployArmTemplates.ParameterNotExist", parameterFilePath),
      getLocalizedString("core.deployArmTemplates.ParameterNotExist", parameterFilePath)
    );
    ctx.logProvider?.error(error.message);
    throw error;
  }

  const parameterJson = await getExpandedParameterV3(ctx, envInfo, parameterFilePath); // only expand secrets in memory

  return parameterJson;
}

async function getExpandedParameterV3(ctx: v2.Context, envInfo: v3.EnvInfoV3, filePath: string) {
  try {
    const parameterTemplate = await fs.readFile(filePath, ConstantString.UTF8Encoding);
    const parameterJsonString = expandParameterPlaceholdersV3(ctx, envInfo, parameterTemplate);
    return JSON.parse(parameterJsonString);
  } catch (err) {
    ctx.logProvider?.error(
      getLocalizedString("core.deployArmTemplates.FailedToExpandParameter", filePath)
    );
    throw err;
  }
}
export async function getResourceManagementClientForArmDeployment(
  azureAccountProvider: AzureAccountProvider,
  subscriptionId: string
): Promise<ResourceManagementClient> {
  const azureToken = await azureAccountProvider.getIdentityCredentialAsync();
  if (!azureToken) {
    throw new InvalidAzureCredentialError();
  }
  if (!subscriptionId) {
    throw new SystemError(
      PluginDisplayName.Solution,
      SolutionError.NoSubscriptionSelected,
      getDefaultString("core.deployArmTemplates.FailedToGetSubsId"),
      getLocalizedString("core.deployArmTemplates.FailedToGetSubsId")
    );
  }
  return new ResourceManagementClient(azureToken, subscriptionId);
}

async function compileBicepToJson(
  bicepCommand: string,
  bicepOrchestrationFilePath: string,
  logger: LogProvider | undefined
): Promise<JSON> {
  try {
    const result = await executeCommand(
      bicepCommand,
      ["build", bicepOrchestrationFilePath, "--stdout"],
      logger,
      { shell: false }
    );
    return JSON.parse(result);
  } catch (err) {
    throw new Error(getLocalizedString("core.deployArmTemplates.CompileBicepFailed", err.message));
  }
}

function expandParameterPlaceholdersV3(
  ctx: v2.Context,
  envInfo: v3.EnvInfoV3,
  parameterContent: string
): string {
  const projectSettingsV3 = ctx.projectSetting as ProjectSettingsV3;
  const componentNames = projectSettingsV3.components.map((c) => c.name);
  const stateVariables: Record<string, Record<string, any>> = {};
  const availableVariables: Record<string, Record<string, any>> = { state: stateVariables };
  const envState = envInfo.state as v3.TeamsFxAzureResourceStates;
  // Add plugin contexts to available variables
  for (const componentName of componentNames) {
    const resourceState = envState[componentName] || {};
    // const pluginContext = getPluginContext(ctx, plugin.name);
    const pluginVariables: Record<string, string> = {};
    for (const key of Object.keys(resourceState)) {
      if (typeof resourceState[key] === "string") {
        // Currently we only config with string type
        pluginVariables[key] = resourceState[key];
      }
    }
    stateVariables[componentName] = pluginVariables;
  }
  // Add solution config to available variables
  const solutionConfig = envState.solution as v3.AzureSolutionConfig;
  if (solutionConfig) {
    const solutionVariables: Record<string, string> = {};
    for (const key of Object.keys(solutionConfig)) {
      if (typeof solutionConfig[key] === "string") {
        // Currently we only config with string type
        solutionVariables[key] = solutionConfig[key];
      }
    }
    stateVariables[solutionName] = solutionVariables;
  }

  // Add environment variable to available variables
  const processVariables: Record<string, string> = Object.keys(process.env).reduce(
    (obj: Record<string, string>, key: string) => {
      obj[key] = process.env[key] as string;
      return obj;
    },
    {}
  );

  availableVariables["$env"] = processVariables;

  parameterContent = convertManifestTemplateToV3(parameterContent);

  return compileHandlebarsTemplateString(parameterContent, availableVariables);
}

export function generateResourceBaseName(appName: string, envName: string): string {
  const maxAppNameLength = 10;
  const maxEnvNameLength = 4;
  const normalizedAppName = appName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const normalizedEnvName = envName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return (
    normalizedAppName.substr(0, maxAppNameLength) +
    normalizedEnvName.substr(0, maxEnvNameLength) +
    getUuid().substr(0, 6)
  );
}

export async function wrapGetDeploymentError(
  deployCtx: DeployContext,
  resourceGroupName: string,
  deploymentName: string
): Promise<Result<any, FxError>> {
  try {
    const deploymentError = await getDeploymentError(deployCtx, resourceGroupName, deploymentName);
    return ok(deploymentError);
  } catch (error: any) {
    deployCtx.ctx.logProvider?.error(
      getLocalizedString("core.deployArmTemplates.FailedToGetDeploymentError", error.message)
    );
    return err(
      new UserError(
        SolutionSource,
        "GetDeploymentErrorFailed",
        getDefaultString(
          "core.deployArmTemplates.FailedToGetDeploymentErrorNotification",
          deployCtx.deploymentName,
          deployCtx.resourceGroupName
        ),
        getLocalizedString(
          "core.deployArmTemplates.FailedToGetDeploymentErrorNotification",
          deployCtx.deploymentName,
          deployCtx.resourceGroupName
        )
      )
    );
  }
}

async function getDeploymentError(
  deployCtx: DeployContext,
  resourceGroupName: string,
  deploymentName: string
): Promise<any> {
  let deployment;
  try {
    deployment = await deployCtx.client.deployments.get(resourceGroupName, deploymentName);
  } catch (error: any) {
    if (
      deploymentName !== deployCtx.deploymentName &&
      error.code === ConstantString.DeploymentNotFound
    ) {
      return undefined;
    }
    throw error;
  }

  // The root deployment error name is deployCtx.deploymentName.
  // If we find the root error has a timestamp less than startTime, it is an old error to be ignored.
  // Other erros will be ignored as well.
  if (
    deploymentName === deployCtx.deploymentName &&
    deployment.properties?.timestamp &&
    deployment.properties.timestamp.getTime() < deployCtx.deploymentStartTime
  ) {
    return undefined;
  }
  if (!deployment.properties?.error) {
    return undefined;
  }
  const deploymentError: any = {
    error: deployment.properties?.error,
  };
  const operations = [];
  for await (const page of deployCtx.client.deploymentOperations
    .list(resourceGroupName, deploymentName)
    .byPage({ maxPageSize: 100 })) {
    for (const deploymentOperation of page) {
      operations.push(deploymentOperation);
    }
  }
  for (const operation of operations) {
    if (operation.properties?.statusMessage?.error) {
      if (!deploymentError.subErrors) {
        deploymentError.subErrors = {};
      }
      const name = operation.properties.targetResource?.resourceName ?? operation.id;
      deploymentError.subErrors[name!] = {
        error: operation.properties.statusMessage.error,
      };
      if (
        operation.properties.targetResource?.resourceType ===
          ConstantString.DeploymentResourceType &&
        operation.properties.targetResource?.resourceName &&
        operation.properties.targetResource?.id
      ) {
        const resourceGroupName: string = getResourceGroupNameFromResourceId(
          operation.properties.targetResource.id
        );
        const subError = await getDeploymentError(
          deployCtx,
          resourceGroupName,
          operation.properties.targetResource?.resourceName
        );
        if (subError) {
          deploymentError.subErrors[name!].inner = subError;
        }
      }
    }
  }
  return deploymentError;
}

function getNotificationMessage(deploymentError: any, deploymentName: string): string {
  let failedDeployments: string[] = [];
  if (deploymentError.subErrors) {
    failedDeployments = Object.keys(deploymentError.subErrors);
  } else {
    failedDeployments.push(deploymentName);
  }
  const format = failedDeployments.map((deployment) => deployment + " module");
  return getLocalizedString(
    "core.deployArmTemplates.DeploymentFailedNotification",
    format.join(", ")
  );
}

export function formattedDeploymentError(deploymentError: any): any {
  if (deploymentError.subErrors) {
    const result: any = {};
    for (const key in deploymentError.subErrors) {
      const subError = deploymentError.subErrors[key];
      if (subError.inner) {
        result[key] = formattedDeploymentError(subError.inner);
      } else {
        const needFilter =
          subError.error?.message?.includes("Template output evaluation skipped") &&
          subError.error?.code === "DeploymentOperationFailed";
        if (!needFilter) {
          result[key] = subError.error;
        }
      }
    }
    return result;
  } else {
    return deploymentError.error;
  }
}

class Arm {
  async deployArmTemplates(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    azureAccountProvider: AzureAccountProvider
  ): Promise<Result<undefined, FxError>> {
    return deployArmTemplatesV3(ctx, inputs, envInfo, azureAccountProvider);
  }
}

const arm = new Arm();
export default arm;

export function sendErrorTelemetryThenReturnError(
  eventName: string,
  error: FxError,
  reporter?: TelemetryReporter,
  properties?: { [p: string]: string },
  measurements?: { [p: string]: number },
  errorProps?: string[]
): FxError {
  if (!properties) {
    properties = {};
  }

  if (SolutionTelemetryProperty.Component in properties === false) {
    properties[SolutionTelemetryProperty.Component] = SolutionTelemetryComponentName;
  }

  properties[SolutionTelemetryProperty.Success] = "no";
  if (error instanceof UserError) {
    properties["error-type"] = "user";
  } else {
    properties["error-type"] = "system";
  }

  properties["error-code"] = `${error.source}.${error.name}`;
  properties["error-message"] = error.message;

  reporter?.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
  return error;
}

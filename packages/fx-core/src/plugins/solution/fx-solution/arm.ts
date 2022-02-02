// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ResourceManagementClient, ResourceManagementModels } from "@azure/arm-resources";
import { DeploymentOperation } from "@azure/arm-resources/esm/models";
import {
  AzureAccountProvider,
  AzureSolutionSettings,
  ConfigFolderName,
  EnvInfo,
  EnvNamePlaceholder,
  err,
  FxError,
  LogProvider,
  ok,
  Result,
  returnSystemError,
  returnUserError,
  SolutionContext,
  SystemError,
  UserError,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import os from "os";
import path from "path";
import { Container } from "typedi";
import { format } from "util";
import {
  TEAMS_FX_RESOURCE_ID_KEY,
  GLOBAL_CONFIG,
  RESOURCE_GROUP_NAME,
  SolutionError,
  SolutionSource,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  SolutionTelemetrySuccess,
  SUBSCRIPTION_ID,
} from "./constants";
import { environmentManager } from "../../../core/environment";
import { compileHandlebarsTemplateString, getStrings } from "../../../common";
import { ArmTemplateResult, NamedArmResourcePlugin } from "../../../common/armInterface";
import { ConstantString, HelpLinks, PluginDisplayName } from "../../../common/constants";
import { executeCommand } from "../../../common/cpUtils";
import {
  getResourceGroupNameFromResourceId,
  getSubscriptionIdFromResourceId,
  getUuid,
  waitSeconds,
} from "../../../common/tools";
import { getTemplatesFolder } from "../../../folder";
import { getActivatedV2ResourcePlugins } from "./ResourcePluginContainer";
import { ensureBicep } from "./utils/depsChecker/bicepChecker";
import { DeployArmTemplatesSteps, ProgressHelper } from "./utils/progressHelper";
import { getPluginContext, sendErrorTelemetryThenReturnError } from "./utils/util";
import { NamedArmResourcePluginAdaptor } from "./v2/adaptor";

const bicepOrchestrationFileName = "main.bicep";
const bicepOrchestrationProvisionMainFileName = "mainProvision.bicep";
const bicepOrchestrationConfigMainFileName = "mainConfig.bicep";
const bicepOrchestrationProvisionFileName = "provision.bicep";
const bicepOrchestrationConfigFileName = "config.bicep";
const templatesFolder = "./templates/azure";
const configsFolder = `.${ConfigFolderName}/configs`;
const parameterFileNameTemplate = `azure.parameters.${EnvNamePlaceholder}.json`;
const pollWaitSeconds = 10;
const maxRetryTimes = 4;

// constant string
const resourceBaseName = "resourceBaseName";
const parameterName = "parameters";
const solutionName = "solution";
const InvalidTemplateErrorCode = "InvalidTemplate";

// Get ARM template content from each resource plugin and output to project folder
export async function generateArmTemplate(
  ctx: SolutionContext,
  selectedPlugins: NamedArmResourcePlugin[] = []
): Promise<Result<any, FxError>> {
  let result: Result<void, FxError>;
  ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.GenerateArmTemplateStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });
  try {
    result = await doGenerateArmTemplate(ctx, selectedPlugins);
    if (result.isOk()) {
      ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.GenerateArmTemplate, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
      });
    } else {
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.GenerateArmTemplate,
        result.error,
        ctx.telemetryReporter
      );
    }
  } catch (error) {
    result = err(
      returnSystemError(error, SolutionSource, SolutionError.FailedToGenerateArmTemplates)
    );
    sendErrorTelemetryThenReturnError(
      SolutionTelemetryEvent.GenerateArmTemplate,
      result.error,
      ctx.telemetryReporter
    );
  }
  return result;
}

export async function addFeature(
  ctx: v3.ContextWithManifestProvider,
  inputs: v3.SolutionAddFeatureInputs
): Promise<Result<any, FxError>> {
  let result: Result<void, FxError>;
  ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.GenerateArmTemplateStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });
  try {
    result = await doAddFeature(ctx, inputs);
    if (result.isOk()) {
      ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.GenerateArmTemplate, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
      });
    } else {
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.GenerateArmTemplate,
        result.error,
        ctx.telemetryReporter
      );
    }
  } catch (error) {
    result = err(
      returnSystemError(error, SolutionSource, SolutionError.FailedToGenerateArmTemplates)
    );
    sendErrorTelemetryThenReturnError(
      SolutionTelemetryEvent.GenerateArmTemplate,
      result.error,
      ctx.telemetryReporter
    );
  }
  return result;
}

type DeployContext = {
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
    format(
      getStrings().solution.DeployArmTemplates.PollDeploymentStatusNotice,
      PluginDisplayName.Solution
    )
  );
  while (!deployCtx.finished) {
    await waitSeconds(pollWaitSeconds);
    try {
      const operations = await deployCtx.client.deploymentOperations.list(
        deployCtx.resourceGroupName,
        deployCtx.deploymentName
      );

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
                    await deployCtx.ctx.azureAccountProvider?.getAccountCredentialAsync();
                  client = new ResourceManagementClient(azureToken!, operation.subscriptionId);
                }

                const subOperations = await client.deploymentOperations.list(
                  operation.resourceGroupName,
                  operation.resourceName
                );
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
          `[${PluginDisplayName.Solution}] ${deployCtx.deploymentName} -> waiting to get deplomyment status [Retry time: ${tryCount}]`
        );
      } else if (tryCount === maxRetryTimes) {
        const pollError = returnSystemError(
          error,
          SolutionSource,
          SolutionError.FailedToPollArmDeploymentStatus
        );
        sendErrorTelemetryThenReturnError(
          SolutionTelemetryEvent.ArmDeployment,
          pollError,
          deployCtx.ctx.telemetryReporter
        );
      }
    }
  }
}

export async function doDeployArmTemplates(ctx: SolutionContext): Promise<Result<void, FxError>> {
  const progressHandler = await ProgressHelper.startDeployArmTemplatesProgressHandler(ctx.ui);
  await progressHandler?.next(DeployArmTemplatesSteps.ExecuteDeployment);

  // update parameters
  const parameterJson = await getParameterJson(ctx);
  const resourceGroupName = ctx.envInfo.state.get(GLOBAL_CONFIG)?.getString(RESOURCE_GROUP_NAME);
  if (!resourceGroupName) {
    return err(
      returnSystemError(
        new Error("Failed to get resource group from project solution settings."),
        SolutionSource,
        "NoResourceGroupFound"
      )
    );
  }

  const bicepCommand = await ensureBicep(ctx, ctx.answers);

  // Compile bicep file to json
  const templateDir = path.join(ctx.root, templatesFolder);
  const bicepOrchestrationFilePath = path.join(templateDir, bicepOrchestrationFileName);
  const armTemplateJson = await compileBicepToJson(
    bicepCommand,
    bicepOrchestrationFilePath,
    ctx.logProvider
  );
  ctx.logProvider?.info(
    format(
      getStrings().solution.DeployArmTemplates.CompileBicepSuccessNotice,
      PluginDisplayName.Solution
    )
  );

  // deploy arm templates to azure
  const subscriptionId = ctx.envInfo.state.get(GLOBAL_CONFIG)?.get(SUBSCRIPTION_ID) as string;
  const client = await getResourceManagementClientForArmDeployment(
    ctx.azureAccountProvider!,
    subscriptionId
  );
  const deploymentName = `${PluginDisplayName.Solution}_deployment`.replace(" ", "_").toLowerCase();
  const deploymentParameters: ResourceManagementModels.Deployment = {
    properties: {
      parameters: parameterJson.parameters,
      template: armTemplateJson,
      mode: "Incremental" as ResourceManagementModels.DeploymentMode,
    },
  };

  const deployCtx: DeployContext = {
    ctx: ctx,
    finished: false,
    deploymentStartTime: Date.now(),
    client: client,
    resourceGroupName: resourceGroupName,
    deploymentName: deploymentName,
  };

  try {
    const result = client.deployments
      .createOrUpdate(resourceGroupName, deploymentName, deploymentParameters)
      .then((result) => {
        ctx.logProvider?.info(
          format(
            getStrings().solution.DeployArmTemplates.SuccessNotice,
            PluginDisplayName.Solution,
            resourceGroupName,
            deploymentName
          )
        );
        syncArmOutput(ctx.envInfo, result.properties?.outputs);
        return result;
      })
      .finally(() => {
        deployCtx.finished = true;
      });

    await pollDeploymentStatus(deployCtx);
    await result;
    return ok(undefined);
  } catch (error) {
    // return the error if the template is invalid
    if (error.code === InvalidTemplateErrorCode) {
      return err(
        returnUserError(error, SolutionSource, SolutionError.FailedToValidateArmTemplates)
      );
    }

    // try to get deployment error
    const result = await wrapGetDeploymentError(deployCtx, resourceGroupName, deploymentName);
    if (result.isOk()) {
      const deploymentError = result.value;

      // return thrown error if deploymentError is empty
      if (!deploymentError) {
        return err(
          returnUserError(error, SolutionSource, SolutionError.FailedToDeployArmTemplatesToAzure)
        );
      }
      const deploymentErrorObj = formattedDeploymentError(deploymentError);
      const deploymentErrorMessage = JSON.stringify(deploymentErrorObj, undefined, 2);
      let errorMessage = format(
        getStrings().solution.DeployArmTemplates.FailNotice,
        PluginDisplayName.Solution,
        resourceGroupName,
        deploymentName
      );
      errorMessage += `\nError message: ${error.message}\nDetailed message: \n${deploymentErrorMessage}\nGet toolkit help from ${HelpLinks.ArmHelpLink}.`;
      const notificationMessage = getNotificationMessage(deploymentError, deploymentName);
      const returnError = new UserError(
        new Error(errorMessage),
        SolutionSource,
        SolutionError.FailedToDeployArmTemplatesToAzure,
        HelpLinks.ArmHelpLink,
        notificationMessage
      );
      returnError.innerError = JSON.stringify(deploymentErrorObj);
      return err(returnError);
    } else {
      return result;
    }
  }
}

export async function doDeployArmTemplatesV3(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  azureAccountProvider: AzureAccountProvider
): Promise<Result<void, FxError>> {
  const progressHandler = await ProgressHelper.startDeployArmTemplatesProgressHandler(
    ctx.userInteraction
  );
  await progressHandler?.next(DeployArmTemplatesSteps.ExecuteDeployment);

  // update parameters
  const parameterJson = await getParameterJsonV3(ctx, inputs.projectPath, envInfo);
  const envState = envInfo.state as v3.TeamsFxAzureResourceStates;
  const resourceGroupName = envState.solution.resourceGroupName;
  if (!resourceGroupName) {
    return err(
      returnSystemError(
        new Error("Failed to get resource group from project solution settings."),
        SolutionSource,
        "NoResourceGroupFound"
      )
    );
  }

  const bicepCommand = await ensureBicep(ctx, inputs);

  // Compile bicep file to json
  const templateDir = path.join(inputs.projectPath, templatesFolder);
  const bicepOrchestrationFilePath = path.join(templateDir, bicepOrchestrationFileName);
  const armTemplateJson = await compileBicepToJson(
    bicepCommand,
    bicepOrchestrationFilePath,
    ctx.logProvider
  );
  ctx.logProvider?.info(
    format(
      getStrings().solution.DeployArmTemplates.CompileBicepSuccessNotice,
      PluginDisplayName.Solution
    )
  );

  // deploy arm templates to azure
  const client = await getResourceManagementClientForArmDeployment(
    azureAccountProvider,
    envState.solution.subscriptionId
  );
  const deploymentName = `${PluginDisplayName.Solution}_deployment`.replace(" ", "_").toLowerCase();
  const deploymentParameters: ResourceManagementModels.Deployment = {
    properties: {
      parameters: parameterJson.parameters,
      template: armTemplateJson,
      mode: "Incremental" as ResourceManagementModels.DeploymentMode,
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
      .createOrUpdate(resourceGroupName, deploymentName, deploymentParameters)
      .then((result) => {
        ctx.logProvider?.info(
          format(
            getStrings().solution.DeployArmTemplates.SuccessNotice,
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
    // return the error if the template is invalid
    if (error.code === InvalidTemplateErrorCode) {
      return err(
        returnUserError(error, SolutionSource, SolutionError.FailedToValidateArmTemplates)
      );
    }

    // try to get deployment error
    const result = await wrapGetDeploymentError(deployCtx, resourceGroupName, deploymentName);
    if (result.isOk()) {
      const deploymentError = result.value;

      // return thrown error if deploymentError is empty
      if (!deploymentError) {
        return err(
          returnUserError(error, SolutionSource, SolutionError.FailedToDeployArmTemplatesToAzure)
        );
      }
      const deploymentErrorObj = formattedDeploymentError(deploymentError);
      const deploymentErrorMessage = JSON.stringify(deploymentErrorObj, undefined, 2);
      let errorMessage = format(
        getStrings().solution.DeployArmTemplates.FailNotice,
        PluginDisplayName.Solution,
        resourceGroupName,
        deploymentName
      );
      errorMessage += `\nError message: ${error.message}\nDetailed message: \n${deploymentErrorMessage}\nGet toolkit help from ${HelpLinks.ArmHelpLink}.`;
      const notificationMessage = getNotificationMessage(deploymentError, deploymentName);
      const returnError = new UserError(
        new Error(errorMessage),
        SolutionSource,
        SolutionError.FailedToDeployArmTemplatesToAzure,
        HelpLinks.ArmHelpLink,
        notificationMessage
      );
      returnError.innerError = JSON.stringify(deploymentErrorObj);
      return err(returnError);
    } else {
      return result;
    }
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
            const pluginId = pluginOutput[TEAMS_FX_RESOURCE_ID_KEY];
            if (pluginId) {
              const pluginOutputKeys = Object.keys(pluginOutput);
              for (const pluginOutputKey of pluginOutputKeys) {
                if (pluginOutputKey != TEAMS_FX_RESOURCE_ID_KEY) {
                  if (envInfo.state instanceof Map) {
                    (envInfo.state as Map<string, any>)
                      .get(pluginId)
                      ?.set(pluginOutputKey, pluginOutput[pluginOutputKey]);
                  } else {
                    (envInfo.state as v3.TeamsFxAzureResourceStates)[pluginId][pluginOutputKey] =
                      pluginOutput[pluginOutputKey];
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

export async function deployArmTemplates(ctx: SolutionContext): Promise<Result<void, FxError>> {
  ctx.logProvider?.info(
    format(getStrings().solution.DeployArmTemplates.StartNotice, PluginDisplayName.Solution)
  );
  let result: Result<void, FxError>;
  ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.ArmDeploymentStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });
  try {
    result = await doDeployArmTemplates(ctx);
    if (result.isOk()) {
      ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.ArmDeployment, {
        [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
        [SolutionTelemetryProperty.Success]: SolutionTelemetrySuccess.Yes,
      });
    } else {
      const errorProperties: { [key: string]: string } = {};
      if (result.error.innerError) {
        errorProperties[SolutionTelemetryProperty.ArmDeploymentError] = result.error.innerError;
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
        returnSystemError(error, SolutionSource, SolutionError.FailedToDeployArmTemplatesToAzure)
      );
    } else {
      result = err(
        returnSystemError(
          new Error(JSON.stringify(error)),
          SolutionSource,
          SolutionError.FailedToDeployArmTemplatesToAzure
        )
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

export async function deployArmTemplatesV3(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath,
  envInfo: v3.EnvInfoV3,
  azureAccountProvider: AzureAccountProvider
): Promise<Result<void, FxError>> {
  ctx.logProvider?.info(
    format(getStrings().solution.DeployArmTemplates.StartNotice, PluginDisplayName.Solution)
  );
  let result: Result<void, FxError>;
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
      if (result.error.innerError) {
        errorProperties[SolutionTelemetryProperty.ArmDeploymentError] = result.error.innerError;
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
        returnSystemError(error, SolutionSource, SolutionError.FailedToDeployArmTemplatesToAzure)
      );
    } else {
      result = err(
        returnSystemError(
          new Error(JSON.stringify(error)),
          SolutionSource,
          SolutionError.FailedToDeployArmTemplatesToAzure
        )
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

export async function getParameterJson(ctx: SolutionContext) {
  if (!ctx.envInfo.envName) {
    throw new Error("Failed to get target environment name from solution context.");
  }

  const parameterFileName = parameterFileNameTemplate.replace(
    EnvNamePlaceholder,
    ctx.envInfo.envName
  );
  const parameterFolderPath = path.join(ctx.root, configsFolder);
  const parameterFilePath = path.join(parameterFolderPath, parameterFileName);
  try {
    await fs.stat(parameterFilePath);
  } catch (err) {
    ctx.logProvider?.error(`[${PluginDisplayName.Solution}] ${parameterFilePath} does not exist.`);
    const returnError = new Error(
      `[${PluginDisplayName.Solution}] ${parameterFilePath} does not exist.`
    );
    throw returnUserError(returnError, SolutionSource, "ParameterFileNotExist");
  }

  const parameterJson = await getExpandedParameter(ctx, parameterFilePath); // only expand secrets in memory

  return parameterJson;
}

export async function getParameterJsonV3(
  ctx: v2.Context,
  projectPath: string,
  envInfo: v3.EnvInfoV3
) {
  if (!envInfo?.envName) {
    throw new Error("Failed to get target environment name from solution context.");
  }

  const parameterFileName = parameterFileNameTemplate.replace(EnvNamePlaceholder, envInfo.envName);
  const parameterFolderPath = path.join(projectPath, configsFolder);
  const parameterFilePath = path.join(parameterFolderPath, parameterFileName);
  try {
    await fs.stat(parameterFilePath);
  } catch (err) {
    ctx.logProvider?.error(`[${PluginDisplayName.Solution}] ${parameterFilePath} does not exist.`);
    const returnError = new Error(
      `[${PluginDisplayName.Solution}] ${parameterFilePath} does not exist.`
    );
    throw returnUserError(returnError, SolutionSource, "ParameterFileNotExist");
  }

  const parameterJson = await getExpandedParameterV3(ctx, envInfo, parameterFilePath); // only expand secrets in memory

  return parameterJson;
}

function generateArmFromResult(
  result: ArmTemplateResult,
  bicepOrchestrationTemplate: BicepOrchestrationContent,
  pluginName: string,
  moduleProvisionFiles: Map<string, string>,
  moduleConfigFiles: Map<string, string>
) {
  bicepOrchestrationTemplate.applyTemplate(pluginName, result);
  if (result.Configuration?.Modules) {
    for (const module of Object.entries(result.Configuration.Modules)) {
      const moduleName = module[0];
      const moduleValue = module[1] as string;
      moduleConfigFiles.set(generateBicepModuleConfigFilePath(moduleName), moduleValue);
    }
  }
  if (result.Provision?.Modules) {
    for (const module of Object.entries(result.Provision.Modules)) {
      const moduleName = module[0];
      const moduleValue = module[1] as string;
      moduleProvisionFiles.set(generateBicepModuleProvisionFilePath(moduleName), moduleValue);
    }
  }
}

async function doGenerateArmTemplate(
  ctx: SolutionContext,
  selectedPlugins: NamedArmResourcePlugin[]
): Promise<Result<any, FxError>> {
  const baseName = generateResourceBaseName(ctx.projectSettings!.appName, ctx.envInfo!.envName);
  const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
    (p) => new NamedArmResourcePluginAdaptor(p)
  ); // This function ensures return result won't be empty
  const bicepOrchestrationTemplate = new BicepOrchestrationContent(
    plugins.map((p) => p.name),
    baseName
  );
  const moduleProvisionFiles = new Map<string, string>();
  const moduleConfigFiles = new Map<string, string>();
  // Get bicep content from each resource plugin
  for (const plugin of plugins) {
    const pluginWithArm = plugin as NamedArmResourcePlugin; // Temporary solution before adding it to teamsfx-api
    const pluginContext = getPluginContext(ctx, pluginWithArm.name);
    let result: Result<ArmTemplateResult, FxError>;
    let errMessage = "";
    let method = "";
    if (
      pluginWithArm.updateArmTemplates &&
      !selectedPlugins.find((pluginItem) => pluginItem.name === pluginWithArm.name)
    ) {
      method = "updateArmTemplates";
      result = (await pluginWithArm.updateArmTemplates(pluginContext)) as Result<
        ArmTemplateResult,
        FxError
      >;
      errMessage = getStrings().solution.UpdateArmTemplateFailNotice;
    } else if (
      pluginWithArm.generateArmTemplates &&
      selectedPlugins.find((pluginItem) => pluginItem.name === pluginWithArm.name)
    ) {
      method = "generateArmTemplates";
      result = (await pluginWithArm.generateArmTemplates(pluginContext)) as Result<
        ArmTemplateResult,
        FxError
      >;
      errMessage = getStrings().solution.GenerateArmTemplateFailNotice;
    } else {
      continue;
    }
    if (result.isOk()) {
      ctx.logProvider?.info(`[arm] ${plugin.name}.${method} success!`);
      generateArmFromResult(
        result.value,
        bicepOrchestrationTemplate,
        pluginWithArm.name,
        moduleProvisionFiles,
        moduleConfigFiles
      );
    } else {
      const msg = format(errMessage, ctx.projectSettings?.appName);
      ctx.logProvider?.error(msg);
      return result;
    }
  }

  await persistBicepTemplates(
    bicepOrchestrationTemplate,
    moduleProvisionFiles,
    moduleConfigFiles,
    ctx.root
  );

  return ok(undefined); // Nothing to return when success
}

async function doAddFeature(
  ctx: v3.ContextWithManifestProvider,
  inputs: v3.SolutionAddFeatureInputs
): Promise<Result<any, FxError>> {
  const baseName = generateResourceBaseName(ctx.projectSetting.appName, "");
  const pluginNames = ctx.projectSetting.solutionSettings
    ? (ctx.projectSetting.solutionSettings as AzureSolutionSettings).activeResourcePlugins
    : [];
  pluginNames.push(inputs.feature);
  const bicepOrchestrationTemplate = new BicepOrchestrationContent(pluginNames, baseName);
  const moduleProvisionFiles = new Map<string, string>();
  const moduleConfigFiles = new Map<string, string>();

  // add feature for selected plugin
  const selectedPlugin = await Container.get<v3.FeaturePlugin>(inputs.feature);
  if (!selectedPlugin.addFeature) return ok(undefined);
  const addFeatureRes = await selectedPlugin.addFeature(ctx, inputs);
  if (addFeatureRes && addFeatureRes.isErr()) {
    return err(addFeatureRes.error);
  }
  if (addFeatureRes.value) {
    if (addFeatureRes.value.kind === "bicep") {
      const armTemplate = addFeatureRes.value.template as ArmTemplateResult;
      generateArmFromResult(
        armTemplate,
        bicepOrchestrationTemplate,
        inputs.feature,
        moduleProvisionFiles,
        moduleConfigFiles
      );
      // notify other plugins
      for (const pluginName of pluginNames) {
        if (pluginName === inputs.feature) continue;
        const plugin = Container.get<v3.FeaturePlugin>(pluginName);
        if (plugin.afterOtherFeaturesAdded) {
          const notifyRes = await plugin.afterOtherFeaturesAdded(ctx, {
            ...inputs,
            features: [
              {
                name: inputs.feature,
                value: addFeatureRes.value,
              },
            ],
          });
          if (notifyRes.isErr()) {
            return err(notifyRes.error);
          }
          if (notifyRes.value && notifyRes.value.kind === "bicep") {
            const armTemplate = notifyRes.value.template as ArmTemplateResult;
            generateArmFromResult(
              armTemplate,
              bicepOrchestrationTemplate,
              plugin.name,
              moduleProvisionFiles,
              moduleConfigFiles
            );
          }
        }
      }
      await persistBicepTemplates(
        bicepOrchestrationTemplate,
        moduleProvisionFiles,
        moduleConfigFiles,
        inputs.projectPath
      );
    }
  }
  return ok(undefined); // Nothing to return when success
}

async function persistBicepTemplates(
  bicepOrchestrationTemplate: BicepOrchestrationContent,
  moduleProvisionFiles: Map<string, string>,
  moduleConfigFiles: Map<string, string>,
  projectaPath: string
) {
  // Write bicep content to project folder
  if (bicepOrchestrationTemplate.needsGenerateTemplate()) {
    // Output parameter file
    const envListResult = await environmentManager.listEnvConfigs(projectaPath);
    if (envListResult.isErr()) {
      return err(envListResult.error);
    }
    const parameterEnvFolderPath = path.join(projectaPath, configsFolder);
    await fs.ensureDir(parameterEnvFolderPath);
    for (const env of envListResult.value) {
      const parameterFileName = parameterFileNameTemplate.replace(EnvNamePlaceholder, env);
      const parameterEnvFilePath = path.join(parameterEnvFolderPath, parameterFileName);
      let parameterFileContent = "";
      if (await fs.pathExists(parameterEnvFilePath)) {
        try {
          const parameterFile = await fs.readJson(parameterEnvFilePath);
          const parameterObj = parameterFile.parameters.provisionParameters.value;
          const appendParam = bicepOrchestrationTemplate.getAppendedParameters();
          const duplicateParam = Object.keys(parameterObj).filter((val) =>
            Object.keys(appendParam).includes(val)
          );
          if (duplicateParam && duplicateParam.length != 0) {
            const duplicateParamError = new Error(
              `There are some duplicate parameters in ${parameterEnvFilePath}, to avoid the conflict, please modify these parameter names: ${duplicateParam}`
            );
            return err(
              returnUserError(
                duplicateParamError,
                SolutionSource,
                SolutionError.FailedToUpdateArmParameters,
                HelpLinks.ArmHelpLink
              )
            );
          }
          parameterFile.parameters.provisionParameters.value = Object.assign(
            parameterObj,
            appendParam
          );
          parameterFileContent = JSON.stringify(parameterFile, undefined, 2);
        } catch (error) {
          const parameterFileError = new Error(
            `There are some errors in ${parameterEnvFilePath}, please make sure this file is valid. The error message is ${
              (error as Error).message
            }`
          );
          return err(
            returnUserError(
              parameterFileError,
              SolutionSource,
              SolutionError.FailedToUpdateArmParameters,
              HelpLinks.ArmHelpLink
            )
          );
        }
      } else {
        parameterFileContent = bicepOrchestrationTemplate.getParameterFileContent();
      }
      await fs.writeFile(parameterEnvFilePath, parameterFileContent.replace(/\r?\n/g, os.EOL));
    }

    const templateFolderPath = path.join(projectaPath, templatesFolder);
    await fs.ensureDir(templateFolderPath);
    const templateSolitionPath = path.join(getTemplatesFolder(), "plugins", "solution");
    // Generate provision.bicep and module provision bicep files
    let bicepOrchestrationProvisionContent = "";
    if (
      !(await fs.pathExists(path.join(templateFolderPath, bicepOrchestrationProvisionFileName)))
    ) {
      bicepOrchestrationProvisionContent = await fs.readFile(
        path.join(getTemplatesFolder(), "plugins", "solution", "provision.bicep"),
        ConstantString.UTF8Encoding
      );
    }
    bicepOrchestrationProvisionContent +=
      os.EOL + bicepOrchestrationTemplate.getOrchestractionProvisionContent();
    await fs.appendFile(
      path.join(templateFolderPath, bicepOrchestrationProvisionFileName),
      bicepOrchestrationProvisionContent.replace(/\r?\n/g, os.EOL)
    );
    // Generate provision part to main.bicep files.
    if (!(await fs.pathExists(path.join(templateFolderPath, bicepOrchestrationFileName)))) {
      await fs.copyFile(
        path.join(templateSolitionPath, bicepOrchestrationProvisionMainFileName),
        path.join(templateFolderPath, bicepOrchestrationFileName)
      );
    }
    // Generate provision.biceps.
    await fs.ensureDir(path.join(templateFolderPath, "provision"));
    // Generate module provision bicep files
    for (const module of moduleProvisionFiles) {
      const res = bicepOrchestrationTemplate.applyReference(module[1]);
      await fs.appendFile(path.join(templateFolderPath, module[0]), res.replace(/\r?\n/g, os.EOL));
    }

    // Skip if no any config part in orchestration.
    if (bicepOrchestrationTemplate.getOrchestractionConfigContent() !== "") {
      // Generate config.bicep and module configuration bicep files.
      let bicepOrchestrationConfigContent = "";
      // Configuration Biceps.
      if (!(await fs.pathExists(path.join(templateFolderPath, bicepOrchestrationConfigFileName)))) {
        bicepOrchestrationConfigContent = await fs.readFile(
          path.join(getTemplatesFolder(), "plugins", "solution", "config.bicep"),
          ConstantString.UTF8Encoding
        );
        const mainConfig = await fs.readFile(
          path.join(templateSolitionPath, bicepOrchestrationConfigMainFileName),
          ConstantString.UTF8Encoding
        );
        await fs.appendFile(
          path.join(templateFolderPath, bicepOrchestrationFileName),
          mainConfig.replace(/\r?\n/g, os.EOL)
        );
      }
      bicepOrchestrationConfigContent +=
        os.EOL + bicepOrchestrationTemplate.getOrchestractionConfigContent();
      await fs.appendFile(
        path.join(templateFolderPath, bicepOrchestrationConfigFileName),
        bicepOrchestrationConfigContent.replace(/\r?\n/g, os.EOL)
      );
    }
    // Skip if no module configuration bicep update.
    if (moduleConfigFiles.size != 0) {
      await fs.ensureDir(path.join(templateFolderPath, "teamsFx"));
      for (const module of moduleConfigFiles) {
        const res = bicepOrchestrationTemplate.applyReference(module[1]);
        await fs.writeFile(path.join(templateFolderPath, module[0]), res.replace(/\r?\n/g, os.EOL));
      }
    }
  }
}

async function getExpandedParameter(ctx: SolutionContext, filePath: string) {
  try {
    const parameterTemplate = await fs.readFile(filePath, ConstantString.UTF8Encoding);
    const parameterJsonString = expandParameterPlaceholders(ctx, parameterTemplate);
    return JSON.parse(parameterJsonString);
  } catch (err) {
    ctx.logProvider?.error(
      `[${PluginDisplayName.Solution}] Failed to get expanded parameter from ${filePath}.`
    );
    throw err;
  }
}
async function getExpandedParameterV3(ctx: v2.Context, envInfo: v3.EnvInfoV3, filePath: string) {
  try {
    const parameterTemplate = await fs.readFile(filePath, ConstantString.UTF8Encoding);
    const parameterJsonString = expandParameterPlaceholdersV3(ctx, envInfo, parameterTemplate);
    return JSON.parse(parameterJsonString);
  } catch (err) {
    ctx.logProvider?.error(
      `[${PluginDisplayName.Solution}] Failed to get expanded parameter from ${filePath}.`
    );
    throw err;
  }
}
async function getResourceManagementClientForArmDeployment(
  azureAccountProvider: AzureAccountProvider,
  subscriptionId: string
): Promise<ResourceManagementClient> {
  const azureToken = await azureAccountProvider.getAccountCredentialAsync();
  if (!azureToken) {
    throw returnSystemError(
      new Error("Azure Credential is invalid."),
      PluginDisplayName.Solution,
      SolutionError.FailedToGetAzureCredential
    );
  }
  if (!subscriptionId) {
    throw returnSystemError(
      new Error(`Failed to get subscription id.`),
      PluginDisplayName.Solution,
      SolutionError.NoSubscriptionSelected
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
    throw new Error(`Failed to compile bicep files to Json arm templates file: ${err.message}`);
  }
}

// Context used by handlebars to render the main.bicep file
export class ArmTemplateRenderContext {
  public Plugins: Record<string, PluginContext> = {};

  constructor(pluginNames: string[]) {
    for (const plugin of pluginNames) {
      this.Plugins[plugin] = {};
    }
  }

  public addPluginOutput(pluginName: string, armResult: ArmTemplateResult) {
    const PluginContext: PluginContext = {
      Provision: {},
      Configuration: {},
      References: {},
    };
    const provision = armResult.Provision?.Modules;
    const references = armResult.Reference;
    const configs = armResult.Configuration?.Modules;
    if (provision) {
      for (const module of Object.entries(provision)) {
        const moduleFileName = module[0];
        PluginContext.Provision![moduleFileName] = {
          path: generateBicepModuleProvisionFilePath(moduleFileName),
        };
      }
    }

    if (configs) {
      for (const module of Object.entries(configs)) {
        const moduleFileName = module[0];
        PluginContext.Configuration![moduleFileName] = {
          path: generateBicepModuleConfigFilePath(moduleFileName),
        };
      }
    }

    if (references) {
      for (const output of Object.entries(references)) {
        const outputKey = output[0];
        const outputValue = output[1] as string;
        PluginContext.References![outputKey] = outputValue;
      }
    }

    this.Plugins[pluginName] = PluginContext;
  }
}

// Stores the bicep orchestration information for all resource plugins
class BicepOrchestrationContent {
  private ParameterJsonTemplate: Record<string, string> = {};
  private RenderContext: ArmTemplateRenderContext;
  private TemplateAdded = false;

  private ProvisionTemplate = "";
  private ConfigTemplate = "";

  constructor(pluginNames: string[], baseName: string) {
    this.ParameterJsonTemplate[resourceBaseName] = baseName;
    this.RenderContext = new ArmTemplateRenderContext(pluginNames);
  }

  public applyTemplate(pluginName: string, armResult: ArmTemplateResult): void {
    this.ProvisionTemplate += this.normalizeTemplateSnippet(armResult.Provision?.Orchestration);
    this.ConfigTemplate += this.normalizeTemplateSnippet(armResult.Configuration?.Orchestration);
    this.RenderContext.addPluginOutput(pluginName, armResult);
    Object.assign(this.ParameterJsonTemplate, armResult.Parameters);
  }

  public applyReference(configContent: string): string {
    return compileHandlebarsTemplateString(configContent, this.RenderContext.Plugins);
  }

  public getOrchestractionProvisionContent(): string {
    const orchestrationTemplate =
      this.normalizeTemplateSnippet(this.ProvisionTemplate, false) + os.EOL;
    return compileHandlebarsTemplateString(
      orchestrationTemplate,
      this.RenderContext.Plugins
    ).trim();
  }

  public getOrchestractionConfigContent(): string {
    const orchestrationTemplate =
      this.normalizeTemplateSnippet(this.ConfigTemplate, false) + os.EOL;
    return compileHandlebarsTemplateString(
      orchestrationTemplate,
      this.RenderContext.Plugins
    ).trim();
  }

  public getParameterFileContent(): string {
    const parameterObject = {
      $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
      contentVersion: "1.0.0.0",
      parameters: { provisionParameters: { value: this.ParameterJsonTemplate } },
    };
    return JSON.stringify(parameterObject, undefined, 2);
  }

  public getAppendedParameters(): Record<string, unknown> {
    const res = this.ParameterJsonTemplate;
    if (res.resourceBaseName) {
      delete res.resourceBaseName;
    }
    return res;
  }

  public needsGenerateTemplate(): boolean {
    return this.TemplateAdded;
  }

  private normalizeTemplateSnippet(
    snippet: string | undefined,
    updateTemplateChangeFlag = true
  ): string {
    if (snippet) {
      if (updateTemplateChangeFlag) {
        this.TemplateAdded = true;
      }
      return snippet.trim() + os.EOL;
    }
    return "";
  }
}

interface PluginContext {
  Provision?: { [ModuleName: string]: PluginModuleProperties };
  Configuration?: { [ModuleName: string]: PluginModuleProperties };
  References?: { [Key: string]: string };
}

interface PluginModuleProperties {
  path: string;
}

function generateBicepModuleProvisionFilePath(moduleFileName: string) {
  return `./provision/${moduleFileName}.bicep`;
}

function generateBicepModuleConfigFilePath(moduleFileName: string) {
  return `./teamsFx/${moduleFileName}.bicep`;
}

function expandParameterPlaceholders(ctx: SolutionContext, parameterContent: string): string {
  const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
    (p) => new NamedArmResourcePluginAdaptor(p)
  ); // This function ensures return result won't be empty
  const stateVariables: Record<string, Record<string, any>> = {};
  const availableVariables: Record<string, Record<string, any>> = { state: stateVariables };
  // Add plugin contexts to available variables
  for (const plugin of plugins) {
    const pluginContext = getPluginContext(ctx, plugin.name);
    const pluginVariables: Record<string, string> = {};
    for (const configItem of pluginContext.config) {
      if (typeof configItem[1] === "string") {
        // Currently we only config with string type
        pluginVariables[configItem[0]] = configItem[1];
      }
    }
    stateVariables[plugin.name] = pluginVariables;
  }
  // Add solution config to available variables
  const solutionConfig = ctx.envInfo.state.get(GLOBAL_CONFIG);
  if (solutionConfig) {
    const solutionVariables: Record<string, string> = {};
    for (const configItem of solutionConfig) {
      if (typeof configItem[1] === "string") {
        // Currently we only config with string type
        solutionVariables[configItem[0]] = configItem[1];
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

  return compileHandlebarsTemplateString(parameterContent, availableVariables);
}

function expandParameterPlaceholdersV3(
  ctx: v2.Context,
  envInfo: v3.EnvInfoV3,
  parameterContent: string
): string {
  const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings | undefined;
  const plugins = solutionSettings
    ? solutionSettings.activeResourcePlugins.map((p) => Container.get<v3.FeaturePlugin>(p))
    : [];
  const stateVariables: Record<string, Record<string, any>> = {};
  const availableVariables: Record<string, Record<string, any>> = { state: stateVariables };
  const envState = envInfo.state as v3.TeamsFxAzureResourceStates;
  // Add plugin contexts to available variables
  for (const plugin of plugins) {
    const resourceState = envState[plugin.name] || {};
    // const pluginContext = getPluginContext(ctx, plugin.name);
    const pluginVariables: Record<string, string> = {};
    for (const key of Object.keys(resourceState)) {
      if (typeof resourceState[key] === "string") {
        // Currently we only config with string type
        pluginVariables[key] = resourceState[key];
      }
    }
    stateVariables[plugin.name] = pluginVariables;
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

  return compileHandlebarsTemplateString(parameterContent, availableVariables);
}

function generateResourceBaseName(appName: string, envName: string): string {
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

async function wrapGetDeploymentError(
  deployCtx: DeployContext,
  resourceGroupName: string,
  deploymentName: string
): Promise<Result<any, FxError>> {
  try {
    const deploymentError = await getDeploymentError(deployCtx, resourceGroupName, deploymentName);
    return ok(deploymentError);
  } catch (error: any) {
    deployCtx.ctx.logProvider?.error(
      `[${PluginDisplayName.Solution}] Failed to get deployment error for ${error.message}.`
    );
    const returnError = new Error(
      `resource deployments (${deployCtx.deploymentName} module) for your project failed and get the error message failed. Please refer to the resource group ${deployCtx.resourceGroupName} in portal for deployment error.`
    );
    return err(returnUserError(returnError, SolutionSource, "GetDeploymentErrorFailed"));
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
  if (!deployment.properties?.error) {
    return undefined;
  }
  const deploymentError: any = {
    error: deployment.properties?.error,
  };
  const operations = await deployCtx.client.deploymentOperations.list(
    resourceGroupName,
    deploymentName
  );
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
  return `resource deployments (${format.join(
    ", "
  )}) for your project failed. Please refer to output channel for more error details.`;
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

class ArmV2 {
  async generateArmTemplate(
    ctx: SolutionContext,
    selectedPlugins: NamedArmResourcePlugin[] = []
  ): Promise<Result<any, FxError>> {
    return generateArmTemplate(ctx, selectedPlugins);
  }
  async deployArmTemplates(ctx: SolutionContext): Promise<Result<void, FxError>> {
    return deployArmTemplates(ctx);
  }
}

class Arm {
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v3.SolutionAddFeatureInputs
  ): Promise<Result<any, FxError>> {
    return addFeature(ctx, inputs);
  }
  async deployArmTemplates(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v3.EnvInfoV3,
    azureAccountProvider: AzureAccountProvider
  ): Promise<Result<void, FxError>> {
    return deployArmTemplatesV3(ctx, inputs, envInfo, azureAccountProvider);
  }
}

const arm = new Arm();
export const armV2 = new ArmV2();

export default arm;

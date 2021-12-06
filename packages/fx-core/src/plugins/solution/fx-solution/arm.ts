// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  SolutionContext,
  Plugin,
  Result,
  err,
  ok,
  FxError,
  returnSystemError,
  ConfigFolderName,
  returnUserError,
  EnvNamePlaceholder,
  LogProvider,
} from "@microsoft/teamsfx-api";
import { ArmTemplateResult, NamedArmResourcePlugin } from "../../../common/armInterface";
import {
  getActivatedResourcePlugins,
  getActivatedV2ResourcePlugins,
} from "./ResourcePluginContainer";
import { getPluginContext, sendErrorTelemetryThenReturnError } from "./utils/util";
import { format } from "util";
import { compileHandlebarsTemplateString, getStrings } from "../../../common";
import path from "path";
import * as fs from "fs-extra";
import { ConstantString, HelpLinks, PluginDisplayName } from "../../../common/constants";
import {
  getResourceGroupNameFromResourceId,
  waitSeconds,
  getUuid,
  getSubscriptionIdFromResourceId,
} from "../../../common/tools";
import { environmentManager, isV2 } from "../../..";
import {
  GLOBAL_CONFIG,
  PluginNames,
  RESOURCE_GROUP_NAME,
  SolutionError,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  SolutionTelemetrySuccess,
  SUBSCRIPTION_ID,
  SolutionSource,
} from "./constants";
import { ResourceManagementClient, ResourceManagementModels } from "@azure/arm-resources";
import { DeployArmTemplatesSteps, ProgressHelper } from "./utils/progressHelper";
import { getTemplatesFolder } from "../../../folder";
import { ensureBicep } from "./utils/depsChecker/bicepChecker";
import { executeCommand } from "../../../common/cpUtils";
import { TEAMS_FX_RESOURCE_ID_KEY } from ".";
import os from "os";
import { DeploymentOperation } from "@azure/arm-resources/esm/models";
import { NamedArmResourcePluginAdaptor } from "./v2/adaptor";

const bicepOrchestrationFileName = "main.bicep";
const bicepOrchestrationProvisionFileName = "provision.bicep";
const bicepOrchestrationConfigFileName = "config.bicep";
const templatesFolder = "./templates/azure";
const configsFolder = `.${ConfigFolderName}/configs`;
const parameterFileNameTemplate = `azure.parameters.${EnvNamePlaceholder}.json`;

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
  const failedCount = 4;
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
    await waitSeconds(10);
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
      if (tryCount > failedCount) {
        throw error;
      }
      deployCtx.ctx.logProvider?.warning(
        `[${PluginDisplayName.Solution}] ${deployCtx.deploymentName} -> waiting to get deplomyment status [${tryCount}]`
      );
    }
  }
}

export async function doDeployArmTemplates(ctx: SolutionContext): Promise<Result<void, FxError>> {
  const progressHandler = await ProgressHelper.startDeployArmTemplatesProgressHandler(
    getPluginContext(ctx, PluginNames.SOLUTION)
  );
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

  const bicepCommand = await ensureBicep(ctx);

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
  const client = await getResourceManagementClientForArmDeployment(ctx);
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
        syncArmOutput(ctx, result.properties?.outputs);
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
        returnUserError(error, SolutionSource, SolutionError.FailedToDeployArmTemplatesToAzure)
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

      const deploymentErrorMessage = JSON.stringify(
        formattedDeploymentError(deploymentError),
        undefined,
        2
      );
      const errorMessage = format(
        getStrings().solution.DeployArmTemplates.FailNotice,
        PluginDisplayName.Solution,
        resourceGroupName,
        deploymentName
      );
      ctx.logProvider?.error(
        errorMessage +
          `\nError message: ${error.message}\nDetailed message: \n${deploymentErrorMessage}\nGet toolkit help from ${HelpLinks.ArmHelpLink}.`
      );

      let failedDeployments: string[] = [];
      if (deploymentError.subErrors) {
        failedDeployments = Object.keys(deploymentError.subErrors);
      } else {
        failedDeployments.push(deploymentName);
      }
      return formattedDeploymentName(failedDeployments);
    } else {
      return result;
    }
  }
}

function syncArmOutput(ctx: SolutionContext, armOutput: any) {
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
                  ctx.envInfo.state
                    .get(pluginId)
                    ?.set(pluginOutputKey, pluginOutput[pluginOutputKey]);
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
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.ArmDeployment,
        result.error,
        ctx.telemetryReporter
      );
    }
  } catch (error) {
    result = err(
      returnUserError(error, SolutionSource, SolutionError.FailedToDeployArmTemplatesToAzure)
    );
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
  ctx: SolutionContext,
  targetEnvName: string,
  sourceEnvName: string
) {
  if (!targetEnvName || !sourceEnvName) {
    return;
  }

  const parameterFolderPath = path.join(ctx.root, configsFolder);
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
    const appName = ctx.projectSettings!.appName;
    targetParameterContent[parameterName].provisionParameters.value!.resourceBaseName =
      generateResourceBaseName(appName, targetEnvName);
  }

  await fs.ensureDir(parameterFolderPath);
  await fs.writeFile(targetParameterFilePath, JSON.stringify(targetParameterContent, undefined, 4));
}

export async function getParameterJson(ctx: SolutionContext) {
  if (!ctx.envInfo?.envName) {
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

function generateArmFromResult(
  result: ArmTemplateResult,
  bicepOrchestrationTemplate: BicepOrchestrationContent,
  pluginWithArm: NamedArmResourcePlugin,
  moduleConfigFiles: Map<string, string>,
  moduleProvisionFiles: Map<string, string>
) {
  bicepOrchestrationTemplate.applyTemplate(pluginWithArm.name, result);
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
  const azureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
  const baseName = generateResourceBaseName(ctx.projectSettings!.appName, ctx.envInfo!.envName);
  const plugins = isV2()
    ? getActivatedV2ResourcePlugins(azureSolutionSettings).map(
        (p) => new NamedArmResourcePluginAdaptor(p)
      )
    : getActivatedResourcePlugins(azureSolutionSettings); // This function ensures return result won't be empty
  const bicepOrchestrationTemplate = new BicepOrchestrationContent(
    plugins.map((p) => p.name),
    baseName
  );
  const moduleProvisionFiles = new Map<string, string>();
  const moduleConfigFiles = new Map<string, string>();
  // Get bicep content from each resource plugin
  for (const plugin of plugins) {
    const pluginWithArm = plugin as NamedArmResourcePlugin; // Temporary solution before adding it to teamsfx-api
    // plugin not selected need to be update.
    if (
      pluginWithArm.updateArmTemplates &&
      !selectedPlugins.find((pluginItem) => pluginItem === pluginWithArm)
    ) {
      const pluginContext = getPluginContext(ctx, pluginWithArm.name);
      const result = (await pluginWithArm.updateArmTemplates(pluginContext)) as Result<
        ArmTemplateResult,
        FxError
      >;
      if (result.isOk()) {
        generateArmFromResult(
          result.value,
          bicepOrchestrationTemplate,
          pluginWithArm,
          moduleProvisionFiles,
          moduleConfigFiles
        );
      } else {
        const msg = format(
          getStrings().solution.UpdateArmTemplateFailNotice,
          ctx.projectSettings?.appName
        );
        ctx.logProvider?.error(msg);
        return result;
      }
    } else if (pluginWithArm.generateArmTemplates) {
      // find method using method name
      const pluginContext = getPluginContext(ctx, pluginWithArm.name);
      const result = (await pluginWithArm.generateArmTemplates(pluginContext)) as Result<
        ArmTemplateResult,
        FxError
      >;
      if (result.isOk()) {
        // Once plugins implement updateArmTemplate interface, these code need to be deleted.
        if (
          selectedPlugins.length != 0 &&
          !selectedPlugins.find(({ name }) => name === pluginWithArm.name)
        ) {
          if (result.value.Configuration?.Orchestration)
            delete result.value.Configuration?.Orchestration;
          if (result.value.Provision?.Orchestration) delete result.value.Provision?.Orchestration;
          if (result.value.Provision?.Modules) delete result.value.Provision?.Modules;
          if (result.value.Parameters) delete result.value.Parameters;
        }
        generateArmFromResult(
          result.value,
          bicepOrchestrationTemplate,
          pluginWithArm,
          moduleProvisionFiles,
          moduleConfigFiles
        );
      } else {
        const msg = format(
          getStrings().solution.GenerateArmTemplateFailNotice,
          ctx.projectSettings?.appName
        );
        ctx.logProvider?.error(msg);
        return result;
      }
    }
  }

  // Write bicep content to project folder
  if (bicepOrchestrationTemplate.needsGenerateTemplate()) {
    // Output parameter file
    const envListResult = await environmentManager.listEnvConfigs(ctx.root);
    if (envListResult.isErr()) {
      return err(envListResult.error);
    }
    const parameterEnvFolderPath = path.join(ctx.root, configsFolder);
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
      await fs.writeFile(parameterEnvFilePath, parameterFileContent);
    }
    // Generate main.bicep, config.bicep, provision.bicep
    const templateFolderPath = path.join(ctx.root, templatesFolder);
    await fs.ensureDir(templateFolderPath);
    await fs.ensureDir(path.join(templateFolderPath, "teamsFx"));
    await fs.ensureDir(path.join(templateFolderPath, "provision"));

    let bicepOrchestrationProvisionContent = "";
    let bicepOrchestrationConfigContent = "";
    if (
      !(await fs.pathExists(path.join(templateFolderPath, bicepOrchestrationProvisionFileName)))
    ) {
      bicepOrchestrationProvisionContent = await fs.readFile(
        path.join(getTemplatesFolder(), "plugins", "solution", "provision.bicep"),
        ConstantString.UTF8Encoding
      );
    }
    if (!(await fs.pathExists(path.join(templateFolderPath, bicepOrchestrationConfigFileName)))) {
      bicepOrchestrationConfigContent = await fs.readFile(
        path.join(getTemplatesFolder(), "plugins", "solution", "config.bicep"),
        ConstantString.UTF8Encoding
      );
    }
    bicepOrchestrationProvisionContent +=
      os.EOL + bicepOrchestrationTemplate.getOrchestractionProvisionContent();
    bicepOrchestrationConfigContent +=
      os.EOL + bicepOrchestrationTemplate.getOrchestractionConfigContent();

    const templateSolitionPath = path.join(getTemplatesFolder(), "plugins", "solution");
    if (!(await fs.pathExists(path.join(templateFolderPath, bicepOrchestrationFileName)))) {
      await fs.copyFile(
        path.join(templateSolitionPath, bicepOrchestrationFileName),
        path.join(templateFolderPath, bicepOrchestrationFileName)
      );
    }

    await fs.appendFile(
      path.join(templateFolderPath, bicepOrchestrationProvisionFileName),
      bicepOrchestrationProvisionContent
    );
    await fs.appendFile(
      path.join(templateFolderPath, bicepOrchestrationConfigFileName),
      bicepOrchestrationConfigContent
    );
    // Generate module provision bicep files
    for (const module of moduleProvisionFiles) {
      const res = bicepOrchestrationTemplate.applyReference(module[1]);
      await fs.appendFile(path.join(templateFolderPath, module[0]), res);
    }
    // Generate module configuration bicep files
    for (const module of moduleConfigFiles) {
      const res = bicepOrchestrationTemplate.applyReference(module[1]);
      await fs.writeFile(path.join(templateFolderPath, module[0]), res);
    }
  }

  return ok(undefined); // Nothing to return when success
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

async function getResourceManagementClientForArmDeployment(
  ctx: SolutionContext
): Promise<ResourceManagementClient> {
  const azureToken = await ctx.azureAccountProvider?.getAccountCredentialAsync();
  if (!azureToken) {
    throw returnSystemError(
      new Error("Azure Credential is invalid."),
      PluginDisplayName.Solution,
      SolutionError.FailedToGetAzureCredential
    );
  }

  const subscriptionId = ctx.envInfo.state.get(GLOBAL_CONFIG)?.get(SUBSCRIPTION_ID) as
    | string
    | undefined;
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
  public Plugins: string[];
  public PluginOutput: { [PluginName: string]: PluginOutputContext };

  constructor(pluginNames: string[]) {
    this.Plugins = pluginNames;
    this.PluginOutput = {};
  }

  public addPluginOutput(pluginName: string, armResult: ArmTemplateResult) {
    const pluginOutputContext: PluginOutputContext = {
      Provision: {},
      Configuration: {},
      References: {},
    };
    const provision = armResult.Provision?.Modules;
    const references = armResult.Provision?.Reference;
    const configs = armResult.Configuration?.Modules;
    if (provision) {
      for (const module of Object.entries(provision)) {
        const moduleFileName = module[0];
        pluginOutputContext.Provision![moduleFileName] = {
          ProvisionPath: generateBicepModuleProvisionFilePath(moduleFileName),
        };
      }
    }

    if (configs) {
      for (const module of Object.entries(configs)) {
        const moduleFileName = module[0];
        pluginOutputContext.Configuration![moduleFileName] = {
          ConfigPath: generateBicepModuleConfigFilePath(moduleFileName),
        };
      }
    }

    if (references) {
      for (const output of Object.entries(references)) {
        const outputKey = output[0];
        const outputValue = output[1] as string;
        pluginOutputContext.References![outputKey] = outputValue;
      }
    }

    this.PluginOutput[pluginName] = pluginOutputContext;
  }
}

// Stores the bicep orchestration information for all resource plugins
class BicepOrchestrationContent {
  private ParameterJsonTemplate: Record<string, string> = {};
  private RenderContenxt: ArmTemplateRenderContext;
  private TemplateAdded = false;

  private ProvisionTemplate = "";
  private ConfigTemplate = "";

  constructor(pluginNames: string[], baseName: string) {
    this.ParameterJsonTemplate[resourceBaseName] = baseName;
    this.RenderContenxt = new ArmTemplateRenderContext(pluginNames);
  }

  public applyTemplate(pluginName: string, armResult: ArmTemplateResult): void {
    this.ProvisionTemplate += this.normalizeTemplateSnippet(armResult.Provision?.Orchestration);
    this.ConfigTemplate += this.normalizeTemplateSnippet(armResult.Configuration?.Orchestration);
    this.RenderContenxt.addPluginOutput(pluginName, armResult);
    Object.assign(this.ParameterJsonTemplate, armResult.Parameters);
  }

  public applyReference(configContent: string): string {
    return compileHandlebarsTemplateString(configContent, this.RenderContenxt);
  }

  public getOrchestractionProvisionContent(): string {
    const orchestrationTemplate =
      this.normalizeTemplateSnippet(this.ProvisionTemplate, false) + "\n";
    return compileHandlebarsTemplateString(orchestrationTemplate, this.RenderContenxt).trim();
  }

  public getOrchestractionConfigContent(): string {
    const orchestrationTemplate = this.normalizeTemplateSnippet(this.ConfigTemplate, false) + "\n";
    return compileHandlebarsTemplateString(orchestrationTemplate, this.RenderContenxt).trim();
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
      return snippet.trim() + "\n";
    }
    return "";
  }
}

interface PluginOutputContext {
  Provision?: { [ModuleName: string]: PluginModuleProperties };
  Configuration?: { [ModuleName: string]: PluginModuleProperties };
  References?: { [Key: string]: string };
}

interface PluginModuleProperties {
  [pathName: string]: string;
}

function generateBicepModuleProvisionFilePath(moduleFileName: string) {
  return `./provision/${moduleFileName}.bicep`;
}

function generateBicepModuleConfigFilePath(moduleFileName: string) {
  return `./teamsFx/${moduleFileName}.bicep`;
}

function expandParameterPlaceholders(ctx: SolutionContext, parameterContent: string): string {
  const azureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
  const plugins = isV2()
    ? getActivatedV2ResourcePlugins(azureSolutionSettings).map(
        (p) => new NamedArmResourcePluginAdaptor(p)
      )
    : getActivatedResourcePlugins(azureSolutionSettings); // This function ensures return result won't be empty
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

function formattedDeploymentName(failedDeployments: string[]): Result<void, FxError> {
  const format = failedDeployments.map((deployment) => deployment + " module");
  const returnError = new Error(
    `resource deployments (${format.join(
      ", "
    )}) for your project failed. Please refer to output channel for more error details.`
  );
  return err(
    returnUserError(
      returnError,
      SolutionSource,
      SolutionError.FailedToDeployArmTemplatesToAzure,
      HelpLinks.ArmHelpLink
    )
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

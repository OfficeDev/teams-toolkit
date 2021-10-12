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
} from "@microsoft/teamsfx-api";
import { ScaffoldArmTemplateResult, ArmResourcePlugin } from "../../../common/armInterface";
import { getActivatedResourcePlugins } from "./ResourcePluginContainer";
import { getPluginContext, sendErrorTelemetryThenReturnError } from "./utils/util";
import { format } from "util";
import { compileHandlebarsTemplateString, getStrings } from "../../../common";
import path from "path";
import * as fs from "fs-extra";
import { ArmHelpLink, ConstantString, PluginDisplayName } from "../../../common/constants";
import {
  Executor,
  CryptoDataMatchers,
  getResourceGroupNameFromResourceId,
  waitSeconds,
} from "../../../common/tools";
import {
  ARM_TEMPLATE_OUTPUT,
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
import dateFormat from "dateformat";
import { getTemplatesFolder } from "../../../folder";
import { ensureBicep } from "./utils/depsChecker/bicepChecker";
import { Utils } from "../../resource/frontend/utils";

// Old folder structure constants
const templateFolder = "templates";
const parameterFolder = "parameters";
const bicepOrchestrationFileName = "main.bicep";
const solutionLevelParameters = `param resourceBaseName string\n`;

// New folder structure constants
const templatesFolder = "./templates/azure";
const configsFolder = `.${ConfigFolderName}/configs`;
const modulesFolder = "modules";
const parameterFileNameTemplate = `azure.parameters.${EnvNamePlaceholder}.json`;

// constant string
const resourceBaseName = "resourceBaseName";
const parameterName = "parameters";

// Get ARM template content from each resource plugin and output to project folder
export async function generateArmTemplate(ctx: SolutionContext): Promise<Result<any, FxError>> {
  let result: Result<void, FxError>;
  ctx.telemetryReporter?.sendTelemetryEvent(SolutionTelemetryEvent.GenerateArmTemplateStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });
  try {
    result = await doGenerateArmTemplate(ctx);
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

export async function pollDeploymentStatus(deployCtx: DeployContext) {
  const failedCount = 4;
  let tryCount = 0;
  let previousStatus: { [key: string]: string } = {};
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
      operations.forEach((operation) => {
        if (
          operation.properties?.targetResource?.resourceName &&
          operation.properties.provisioningState &&
          operation.properties?.timestamp &&
          operation.properties.timestamp.getTime() > deployCtx.deploymentStartTime
        ) {
          currentStatus[operation.properties.targetResource.resourceName] =
            operation.properties.provisioningState;
        }
      });
      for (const key in currentStatus) {
        if (currentStatus[key] !== previousStatus[key]) {
          deployCtx.ctx.logProvider?.info(
            `[${PluginDisplayName.Solution}] ${key} -> ${currentStatus[key]}`
          );
        }
      }
      previousStatus = currentStatus;
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

  const resourceGroupName = ctx.envInfo.profile.get(GLOBAL_CONFIG)?.getString(RESOURCE_GROUP_NAME);
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
  const armTemplateJson = await compileBicepToJson(bicepCommand, bicepOrchestrationFilePath);
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
        ctx.envInfo.profile
          .get(GLOBAL_CONFIG)
          ?.set(ARM_TEMPLATE_OUTPUT, result.properties?.outputs);
        return result;
      })
      .finally(() => {
        deployCtx.finished = true;
      });

    await pollDeploymentStatus(deployCtx);
    await result;
    return ok(undefined);
  } catch (error) {
    ctx.logProvider?.error(
      format(
        getStrings().solution.DeployArmTemplates.FailNotice,
        PluginDisplayName.Solution,
        resourceGroupName,
        deploymentName
      )
    );

    const result = await wrapGetDeploymentError(deployCtx, resourceGroupName, deploymentName);
    if (result.isOk()) {
      const deploymentError = result.value;
      ctx.logProvider?.error(
        `[${PluginDisplayName.Solution}] ${deploymentName} -> ${JSON.stringify(
          formattedDeploymentError(deploymentError),
          undefined,
          2
        )}`
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
      returnUserError(
        error,
        PluginDisplayName.Solution,
        SolutionError.FailedToDeployArmTemplatesToAzure
      )
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
  if (targetParameterContent[parameterName][resourceBaseName]) {
    const appName = ctx.projectSettings!.appName;
    targetParameterContent[parameterName][resourceBaseName] = {
      value: generateResourceBaseName(appName, targetEnvName),
    };
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

  const parameterJson = await getExpandedParameter(ctx, parameterFilePath, true); // only expand secrets in memory

  return parameterJson;
}

async function doGenerateArmTemplate(ctx: SolutionContext): Promise<Result<any, FxError>> {
  const azureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
  const plugins = getActivatedResourcePlugins(azureSolutionSettings); // This function ensures return result won't be empty
  const baseName = generateResourceBaseName(ctx.projectSettings!.appName, ctx.envInfo!.envName);
  const bicepOrchestrationTemplate = new BicepOrchestrationContent(
    plugins.map((p) => p.name),
    baseName
  );
  const moduleFiles = new Map<string, string>();

  // Get bicep content from each resource plugin
  for (const plugin of plugins) {
    const pluginWithArm = plugin as Plugin & ArmResourcePlugin; // Temporary solution before adding it to teamsfx-api
    if (pluginWithArm.generateArmTemplates) {
      // find method using method name
      const pluginContext = getPluginContext(ctx, pluginWithArm.name);
      const result = (await pluginWithArm.generateArmTemplates(pluginContext)) as Result<
        ScaffoldArmTemplateResult,
        FxError
      >;
      if (result.isOk()) {
        bicepOrchestrationTemplate.applyTemplate(pluginWithArm.name, result.value);
        if (result.value.Modules) {
          for (const module of Object.entries(result.value.Modules)) {
            const moduleFileName = module[0];
            const moduleFileContent = module[1].Content;
            moduleFiles.set(generateBicepModuleFilePath(moduleFileName), moduleFileContent);
          }
        }
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
    await backupExistingFilesIfNecessary(ctx);
    // Output main.bicep file
    const bicepOrchestrationFileContent = bicepOrchestrationTemplate.getOrchestrationFileContent();
    const templateFolderPath = path.join(ctx.root, templatesFolder);
    await fs.ensureDir(templateFolderPath);
    await fs.writeFile(
      path.join(templateFolderPath, bicepOrchestrationFileName),
      bicepOrchestrationFileContent
    );

    // Output bicep module files from each resource plugin
    const modulesFolderPath = path.join(templateFolderPath, modulesFolder);
    await fs.ensureDir(modulesFolderPath);
    for (const module of moduleFiles) {
      // module[0] contains relative path to template folder, e.g. "./modules/frontendHosting.bicep"
      await fs.writeFile(path.join(templateFolderPath, module[0]), module[1]);
    }

    // Output parameter file
    const parameterFileName = parameterFileNameTemplate.replace(
      EnvNamePlaceholder,
      ctx.envInfo.envName
    );
    const parameterEnvFolderPath = path.join(ctx.root, configsFolder);
    const parameterEnvFilePath = path.join(parameterEnvFolderPath, parameterFileName);
    const parameterFileContent = bicepOrchestrationTemplate.getParameterFileContent();
    await fs.ensureDir(parameterEnvFolderPath);
    await fs.writeFile(parameterEnvFilePath, parameterFileContent);

    // Output .gitignore file
    const gitignoreContent = await fs.readFile(
      path.join(getTemplatesFolder(), "plugins", "solution", "armGitignore"),
      ConstantString.UTF8Encoding
    );
    const gitignoreFileName = ".gitignore";
    const gitignoreFilePath = path.join(ctx.root, templatesFolder, gitignoreFileName);
    if (!(await fs.pathExists(gitignoreFilePath))) {
      await fs.writeFile(gitignoreFilePath, gitignoreContent);
    }
  }

  return ok(undefined); // Nothing to return when success
}

async function getExpandedParameter(
  ctx: SolutionContext,
  filePath: string,
  expandSecrets: boolean
) {
  try {
    const parameterTemplate = await fs.readFile(filePath, ConstantString.UTF8Encoding);
    const parameterJsonString = expandParameterPlaceholders(ctx, parameterTemplate, expandSecrets);
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

  const subscriptionId = ctx.envInfo.profile.get(GLOBAL_CONFIG)?.get(SUBSCRIPTION_ID) as
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
  bicepOrchestrationFilePath: string
): Promise<JSON> {
  const command = `${bicepCommand} build "${bicepOrchestrationFilePath}" --stdout`;
  try {
    const result = await Executor.execCommandAsync(command);
    return JSON.parse(result.stdout as string);
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

  public addPluginOutput(pluginName: string, scaffoldResult: ScaffoldArmTemplateResult) {
    const pluginOutputContext: PluginOutputContext = {
      Modules: {},
      Outputs: {},
    };
    const modules = scaffoldResult.Modules;
    const outputs = scaffoldResult.Orchestration.ModuleTemplate?.Outputs;

    if (modules) {
      for (const module of Object.entries(modules)) {
        const moduleFileName = module[0];
        pluginOutputContext.Modules![moduleFileName] = {
          Path: generateBicepModuleFilePath(moduleFileName),
        };
      }
    }

    if (outputs) {
      for (const output of Object.entries(outputs)) {
        const outputKey = output[0];
        const outputValue = output[1];
        pluginOutputContext.Outputs![outputKey] = outputValue;
      }
    }

    this.PluginOutput[pluginName] = pluginOutputContext;
  }
}

// Stores the bicep orchestration information for all resource plugins
class BicepOrchestrationContent {
  private ParameterTemplate: string = solutionLevelParameters;
  private VariableTemplate = "";
  private ModuleTemplate = "";
  private OutputTemplate = "";
  private ParameterJsonTemplate: Record<string, unknown> = {};
  private RenderContenxt: ArmTemplateRenderContext;
  private TemplateAdded = false;

  constructor(pluginNames: string[], baseName: string) {
    this.ParameterJsonTemplate[resourceBaseName] = { value: baseName };
    this.RenderContenxt = new ArmTemplateRenderContext(pluginNames);
  }

  public applyTemplate(pluginName: string, scaffoldResult: ScaffoldArmTemplateResult): void {
    this.ParameterTemplate += this.normalizeTemplateSnippet(
      scaffoldResult.Orchestration.ParameterTemplate?.Content
    );
    this.VariableTemplate += this.normalizeTemplateSnippet(
      scaffoldResult.Orchestration.VariableTemplate?.Content
    );
    this.ModuleTemplate += this.normalizeTemplateSnippet(
      scaffoldResult.Orchestration.ModuleTemplate?.Content
    );
    this.OutputTemplate += this.normalizeTemplateSnippet(
      scaffoldResult.Orchestration.OutputTemplate?.Content
    );
    // update context to render the template
    this.RenderContenxt.addPluginOutput(pluginName, scaffoldResult);
    // Update parameters for bicep file
    Object.assign(
      this.ParameterJsonTemplate,
      scaffoldResult.Orchestration.ParameterTemplate?.ParameterJson
    );
  }

  public getOrchestrationFileContent(): string {
    let orchestrationTemplate = "";
    orchestrationTemplate += this.normalizeTemplateSnippet(this.ParameterTemplate, false) + "\n";
    orchestrationTemplate += this.normalizeTemplateSnippet(this.VariableTemplate, false) + "\n";
    orchestrationTemplate += this.normalizeTemplateSnippet(this.ModuleTemplate, false) + "\n";
    orchestrationTemplate += this.normalizeTemplateSnippet(this.OutputTemplate, false);

    return compileHandlebarsTemplateString(orchestrationTemplate, this.RenderContenxt).trim();
  }

  public getParameterFileContent(): string {
    const parameterObject = {
      $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
      contentVersion: "1.0.0.0",
      parameters: this.ParameterJsonTemplate,
    };
    return JSON.stringify(parameterObject, undefined, 2);
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
  Modules?: { [ModuleName: string]: PluginModuleProperties };
  Outputs?: { [Key: string]: string };
}

interface PluginModuleProperties {
  Path: string;
}

function generateBicepModuleFilePath(moduleFileName: string) {
  return `./modules/${moduleFileName}.bicep`;
}

function expandParameterPlaceholders(
  ctx: SolutionContext,
  parameterContent: string,
  expandSecrets: boolean
): string {
  const azureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
  const plugins = getActivatedResourcePlugins(azureSolutionSettings); // This function ensures return result won't be empty
  const profileVariables: Record<string, string> = {};
  const availableVariables: Record<string, Record<string, string>> = { profile: profileVariables };
  // Add plugin contexts to available variables
  for (const plugin of plugins) {
    const pluginContext = getPluginContext(ctx, plugin.name);
    for (const configItem of pluginContext.config) {
      if (typeof configItem[1] === "string") {
        // Currently we only config with string type
        const variableName = `${normalizeToEnvName(plugin.name)}__${normalizeToEnvName(
          configItem[0]
        )}`;
        profileVariables[variableName] = configItem[1];
      }
    }
  }
  // Add solution config to available variables
  const solutionConfig = ctx.envInfo.profile.get(GLOBAL_CONFIG);
  if (solutionConfig) {
    for (const configItem of solutionConfig) {
      if (typeof configItem[1] === "string") {
        // Currently we only config with string type
        const variableName = `SOLUTION__${normalizeToEnvName(configItem[0])}`;
        profileVariables[variableName] = configItem[1];
      }
    }
  }
  // Add environment variable to available variables
  Object.assign(profileVariables, process.env); // The environment variable has higher priority

  if (expandSecrets === false) {
    escapeSecretPlaceholders(profileVariables);
  }

  return compileHandlebarsTemplateString(parameterContent, availableVariables);
}

function normalizeToEnvName(input: string): string {
  return input.toUpperCase().replace(/-/g, "_").replace(/\./g, "__"); // replace "-" to "_" and "." to "__"
}

function generateResourceBaseName(appName: string, envName: string): string {
  const maxAppNameLength = 10;
  const macEnvNameLength = 10;
  const normalizedAppName = appName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return normalizedAppName.substr(0, maxAppNameLength) + envName.substr(0, macEnvNameLength);
}

function escapeSecretPlaceholders(variables: Record<string, string>) {
  for (const key of CryptoDataMatchers) {
    const normalizedKey = `${normalizeToEnvName(key)}`;
    variables[normalizedKey] = `{{${normalizedKey}}}`; // replace value of 'SECRET_PLACEHOLDER' with '{{SECRET_PLACEHOLDER}}' so the placeholder remains unchanged
  }
}

// backup existing ARM template and parameter files to backup folder named with current timestamp
async function backupExistingFilesIfNecessary(ctx: SolutionContext): Promise<void> {
  const armBaseFolder = path.join(ctx.root, templatesFolder);
  const parameterJsonFolder = path.join(ctx.root, configsFolder);

  const files = await Utils.listFilePaths(parameterJsonFolder, "azure.parameter*");
  const armBaseFolderExist = await fs.pathExists(armBaseFolder);
  if (armBaseFolderExist || files.length > 0) {
    const backupFolder = path.join(
      ctx.root,
      templateFolder,
      "backup",
      dateFormat(new Date(), "yyyymmddHHMMssl")
    ); // example: ./infra/azure/backup/20210823080000000
    const templateBackupFolder = path.join(backupFolder, templateFolder);
    const parameterBackupFolder = path.join(backupFolder, parameterFolder);
    await fs.ensureDir(backupFolder);
    await fs.ensureDir(parameterBackupFolder);
    if (armBaseFolderExist) {
      await fs.move(armBaseFolder, templateBackupFolder);
    }
    for (const file of files) {
      const baseName = path.basename(file);
      await fs.move(file, path.join(parameterBackupFolder, baseName));
    }
  }
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
      ArmHelpLink
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

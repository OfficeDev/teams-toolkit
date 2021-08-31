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
} from "@microsoft/teamsfx-api";
import { ScaffoldArmTemplateResult, ArmResourcePlugin } from "../../../common/armInterface";
import { getActivatedResourcePlugins } from "./ResourcePluginContainer";
import { getPluginContext } from "./utils/util";
import { format } from "util";
import { compileHandlebarsTemplateString, getStrings } from "../../../common";
import path from "path";
import * as fs from "fs-extra";
import { ArmDeploymentStatus, ConstantString, PluginDisplayName } from "../../../common/constants";
import { Executor, CryptoDataMatchers, isFeatureFlagEnabled } from "../../../common/tools";
import {
  ARM_TEMPLATE_OUTPUT,
  GLOBAL_CONFIG,
  PluginNames,
  RESOURCE_GROUP_NAME,
  SolutionError,
} from "./constants";
import { ResourceManagementClient, ResourceManagementModels } from "@azure/arm-resources";
import { DeployArmTemplatesSteps, ProgressHelper } from "./utils/progressHelper";
import dateFormat from "dateformat";
import { getTemplatesFolder } from "../../../folder";
import {
  ProvisioningState,
  DeploymentsListByResourceGroupResponse,
} from "@azure/arm-resources/esm/models";

// Old folder structure constants
const baseFolder = "./infra/azure";
const templateFolder = "templates";
const parameterFolder = "parameters";
const bicepOrchestrationFileName = "main.bicep";
const armTemplateJsonFileName = "main.json";
const parameterTemplateFileName = "parameters.template.json";
const parameterFileNameTemplate = "parameters.@envName.json";
const solutionLevelParameters = `param resourceBaseName string\n`;
const solutionLevelParameterObject = {
  resourceBaseName: {
    value: "{{SOLUTION__RESOURCE_BASE_NAME}}",
  },
};

// New folder structure constants
const templateFolderNew = "./templates/azure";
const configsFolder = `.${ConfigFolderName}/configs`;
const modulesFolder = "modules";
const parameterFileNameTemplateNew = "azure.parameters.@envName.json";

// Get ARM template content from each resource plugin and output to project folder
export async function generateArmTemplate(ctx: SolutionContext): Promise<Result<any, FxError>> {
  const azureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
  const plugins = getActivatedResourcePlugins(azureSolutionSettings); // This function ensures return result won't be empty

  const bicepOrchestrationTemplate = new BicepOrchestrationContent(plugins.map((p) => p.name));
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
    const templateFolderPath = isNewFolderStructureEnabled()
      ? path.join(ctx.root, templateFolderNew)
      : path.join(ctx.root, baseFolder, templateFolder);
    await fs.ensureDir(templateFolderPath);
    await fs.writeFile(
      path.join(templateFolderPath, bicepOrchestrationFileName),
      bicepOrchestrationFileContent
    );

    // Output bicep module files from each resource plugin
    const modulesFolderPath = isNewFolderStructureEnabled()
      ? path.join(templateFolderPath, modulesFolder)
      : templateFolderPath;
    await fs.ensureDir(modulesFolderPath);
    for (const module of moduleFiles) {
      // module[0] contains relative path to template folder, e.g. "./modules/frontendHosting.bicep"
      await fs.writeFile(path.join(templateFolderPath, module[0]), module[1]);
    }

    // Output parameter file
    const parameterTemplateFolderPath = isNewFolderStructureEnabled()
      ? path.join(ctx.root, templateFolderNew)
      : path.join(ctx.root, baseFolder, parameterFolder);
    const parameterTemplateFilePath = path.join(
      parameterTemplateFolderPath,
      parameterTemplateFileName
    );
    const parameterFileContent = bicepOrchestrationTemplate.getParameterFileContent();
    await fs.ensureDir(parameterTemplateFolderPath);
    await fs.writeFile(parameterTemplateFilePath, parameterFileContent);

    // Output .gitignore file
    const gitignoreContent = await fs.readFile(
      path.join(getTemplatesFolder(), "plugins", "solution", "armGitignore"),
      ConstantString.UTF8Encoding
    );
    const gitignoreFileName = ".gitignore";
    const gitignoreFilePath = isNewFolderStructureEnabled()
      ? path.join(ctx.root, templateFolderNew, gitignoreFileName)
      : path.join(ctx.root, baseFolder, gitignoreFileName);
    if (!(await fs.pathExists(gitignoreFilePath))) {
      await fs.writeFile(gitignoreFilePath, gitignoreContent);
    }
  }

  return ok(undefined); // Nothing to return when success
}

type DeployContext = {
  ctx: SolutionContext;
  finished: boolean;
  client: ResourceManagementClient;
  resourceGroupName: string;
  deploymentStartTime: number;
  deploymentName: string;
};

async function pollDeploymentStatus(deployCtx: DeployContext) {
  while (!deployCtx.finished) {
    const deployments = await deployCtx.client.deployments.listByResourceGroup(
      deployCtx.resourceGroupName
    );
    const status = extractDeploymentStatus(deployCtx, deployments);
    deployCtx.ctx.logProvider?.info(
      format(
        getStrings().solution.DeployArmTemplates.PollDeploymentStatusNotice,
        PluginDisplayName.Solution
      )
    );
    if (status.get(ArmDeploymentStatus.Running)?.length) {
      deployCtx.ctx.logProvider?.info(
        `[${PluginDisplayName.Solution}] Running deployments-> ${status
          .get(ArmDeploymentStatus.Running)
          ?.join(",")}`
      );
    }
    if (status.get(ArmDeploymentStatus.Succeeded)?.length) {
      deployCtx.ctx.logProvider?.info(
        `[${PluginDisplayName.Solution}] Succedded deployments-> ${status
          .get(ArmDeploymentStatus.Succeeded)
          ?.join(",")}`
      );
    }
    if (status.get(ArmDeploymentStatus.Failed)?.length) {
      deployCtx.ctx.logProvider?.info(
        `[${PluginDisplayName.Solution}] Failed deployments-> ${status
          .get(ArmDeploymentStatus.Failed)
          ?.join(",")}`
      );
    }
    await waitSeconds(10);
  }
}

function extractDeploymentStatus(
  deployCtx: DeployContext,
  deployments: DeploymentsListByResourceGroupResponse
): Map<string, string[]> {
  const status = new Map<string, string[]>([
    [ArmDeploymentStatus.Running, []],
    [ArmDeploymentStatus.Failed, []],
    [ArmDeploymentStatus.Succeeded, []],
  ]);
  deployments.forEach((deployment) => {
    if (
      deployment.properties?.timestamp &&
      deployment.properties.timestamp.getTime() > deployCtx.deploymentStartTime &&
      deployment.name &&
      deployment.name !== deployCtx.deploymentName
    ) {
      if (deployment.properties.provisioningState === ArmDeploymentStatus.Succeeded) {
        status.get(ArmDeploymentStatus.Succeeded)?.push(deployment.name);
      } else if (deployment.properties.provisioningState === ArmDeploymentStatus.Failed) {
        status.get(ArmDeploymentStatus.Failed)?.push(deployment.name);
      } else {
        status.get(ArmDeploymentStatus.Running)?.push(deployment.name);
      }
    }
  });
  return status;
}

export async function doDeployArmTemplates(ctx: SolutionContext): Promise<Result<void, FxError>> {
  const progressHandler = await ProgressHelper.startDeployArmTemplatesProgressHandler(
    getPluginContext(ctx, PluginNames.SOLUTION)
  );
  await progressHandler?.next(DeployArmTemplatesSteps.ExecuteDeployment);

  generateResourceName(ctx);

  // update parameters
  const parameterJson = await getParameterJson(ctx);

  const resourceGroupName = ctx.envInfo.profile.get(GLOBAL_CONFIG)?.getString(RESOURCE_GROUP_NAME);
  if (!resourceGroupName) {
    return err(
      returnSystemError(
        new Error("Failed to get resource group from project solution settings."),
        "Solution",
        "NoResourceGroupFound"
      )
    );
  }

  // Compile bicep file to json
  const templateDir = isNewFolderStructureEnabled()
    ? path.join(ctx.root, templateFolderNew)
    : path.join(ctx.root, baseFolder, templateFolder);
  const armTemplateJsonFilePath = path.join(templateDir, armTemplateJsonFileName);
  const bicepOrchestrationFilePath = path.join(templateDir, bicepOrchestrationFileName);
  await compileBicepToJson(bicepOrchestrationFilePath, armTemplateJsonFilePath);
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
      template: JSON.parse(await fs.readFile(armTemplateJsonFilePath, ConstantString.UTF8Encoding)),
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

    let returnError: Error;
    if (error.message.includes("At least one resource deployment operation failed")) {
      let errorMessage = "resource deployments failed. ";
      const deployments = await deployCtx.client.deployments.listByResourceGroup(
        deployCtx.resourceGroupName
      );
      deployments.forEach((deployment) => {
        if (
          deployment.properties &&
          deployment.properties.provisioningState === ArmDeploymentStatus.Failed &&
          deployment.properties.error &&
          deployment.properties.timestamp &&
          deployment.properties.timestamp.getTime() > deployCtx.deploymentStartTime &&
          deployment.name !== deployCtx.deploymentName
        ) {
          if (deployment.properties.error.details?.length) {
            errorMessage += `(${deployment.name}) code: ${deployment.properties.error.details[0].code}, message: ${deployment.properties.error.details[0].message}.`;
          } else {
            errorMessage += `(${deployment.name}) code: ${deployment.properties.error.code}, message: ${deployment.properties.error.message}.`;
          }
        }
      });
      returnError = new Error(errorMessage);
    } else {
      returnError = new Error(`Failed to deploy arm templates to azure. Error: ${error.message}`);
    }
    return err(returnUserError(returnError, "Solution", "ArmDeploymentFailed"));
  }
}

export async function deployArmTemplates(ctx: SolutionContext): Promise<Result<void, FxError>> {
  ctx.logProvider?.info(
    format(getStrings().solution.DeployArmTemplates.StartNotice, PluginDisplayName.Solution)
  );
  let result: Result<void, FxError>;
  try {
    result = await doDeployArmTemplates(ctx);
  } catch (error) {
    result = err(
      returnSystemError(
        error,
        PluginDisplayName.Solution,
        SolutionError.FailedToDeployArmTemplatesToAzure
      )
    );
  }
  await ProgressHelper.endDeployArmTemplatesProgress(result.isOk());
  return result;
}

async function getParameterJson(ctx: SolutionContext) {
  if (!ctx.envInfo?.envName) {
    throw new Error("Failed to get target environment name from solution context.");
  }

  let parameterFileName, parameterFolderPath, parameterTemplateFilePath;
  if (isNewFolderStructureEnabled()) {
    parameterFileName = parameterFileNameTemplateNew.replace("@envName", ctx.envInfo.envName);
    parameterFolderPath = path.join(ctx.root, configsFolder);
    parameterTemplateFilePath = path.join(
      path.join(ctx.root, templateFolderNew),
      parameterTemplateFileName
    );
  } else {
    parameterFileName = parameterFileNameTemplate.replace("@envName", ctx.envInfo.envName);
    parameterFolderPath = path.join(ctx.root, baseFolder, parameterFolder);
    parameterTemplateFilePath = path.join(parameterFolderPath, parameterTemplateFileName);
  }

  const parameterFilePath = path.join(parameterFolderPath, parameterFileName);
  let createNewParameterFile = false;
  try {
    await fs.stat(parameterFilePath);
  } catch (err) {
    ctx.logProvider?.info(
      `[${PluginDisplayName.Solution}] ${parameterFilePath} does not exist. Generate it using ${parameterTemplateFilePath}.`
    );
    createNewParameterFile = true;
  }

  let parameterJson;
  if (createNewParameterFile) {
    parameterJson = await getExpandedParameter(ctx, parameterTemplateFilePath, false); // do not expand secrets to avoid saving secrets to parameter file
    await fs.ensureDir(parameterFolderPath);
    await fs.writeFile(parameterFilePath, JSON.stringify(parameterJson, undefined, 2));
  }

  parameterJson = await getExpandedParameter(ctx, parameterFilePath, true); // only expand secrets in memory

  return parameterJson;
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

  const subscriptionId = (await ctx.azureAccountProvider?.getSelectedSubscription())
    ?.subscriptionId;
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
  bicepOrchestrationFilePath: string,
  jsonFilePath: string
): Promise<void> {
  // TODO: ensure bicep cli is installed
  const command = `bicep build ${bicepOrchestrationFilePath} --outfile ${jsonFilePath}`;
  try {
    await Executor.execCommandAsync(command);
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
  private ParameterJsonTemplate: Record<string, unknown> = solutionLevelParameterObject;
  private RenderContenxt: ArmTemplateRenderContext;
  private TemplateAdded = false;

  constructor(pluginNames: string[]) {
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
  return isNewFolderStructureEnabled()
    ? `./modules/${moduleFileName}.bicep`
    : `./${moduleFileName}.bicep`;
}

function expandParameterPlaceholders(
  ctx: SolutionContext,
  parameterContent: string,
  expandSecrets: boolean
): string {
  const azureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
  const plugins = getActivatedResourcePlugins(azureSolutionSettings); // This function ensures return result won't be empty
  const availableVariables: Record<string, string> = {};
  // Add plugin contexts to available variables
  for (const plugin of plugins) {
    const pluginContext = getPluginContext(ctx, plugin.name);
    for (const configItem of pluginContext.config) {
      if (typeof configItem[1] === "string") {
        // Currently we only config with string type
        const variableName = `${normalizeToEnvName(plugin.name)}__${normalizeToEnvName(
          configItem[0]
        )}`;
        availableVariables[variableName] = configItem[1];
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
        availableVariables[variableName] = configItem[1];
      }
    }
  }
  // Add environment variable to available variables
  Object.assign(availableVariables, process.env); // The environment variable has higher priority

  if (expandSecrets === false) {
    escapeSecretPlaceholders(availableVariables);
  }

  return compileHandlebarsTemplateString(parameterContent, availableVariables);
}

function normalizeToEnvName(input: string): string {
  return input.toUpperCase().replace(/-/g, "_").replace(/\./g, "__"); // replace "-" to "_" and "." to "__"
}

function generateResourceName(ctx: SolutionContext): void {
  const maxAppNameLength = 10;
  const appName = ctx.projectSettings!.appName;
  const suffix = ctx.envInfo.profile.get(GLOBAL_CONFIG)?.getString("resourceNameSuffix");
  const normalizedAppName = appName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  ctx.envInfo.profile
    .get(GLOBAL_CONFIG)
    ?.set("resource_base_name", normalizedAppName.substr(0, maxAppNameLength) + suffix);
}

function escapeSecretPlaceholders(variables: Record<string, string>) {
  for (const key of CryptoDataMatchers) {
    const normalizedKey = `${normalizeToEnvName(key)}`;
    variables[normalizedKey] = `{{${normalizedKey}}}`; // replace value of 'SECRET_PLACEHOLDER' with '{{SECRET_PLACEHOLDER}}' so the placeholder remains unchanged
  }
}

// backup existing ARM template and parameter files to backup folder named with current timestamp
async function backupExistingFilesIfNecessary(ctx: SolutionContext): Promise<void> {
  const armBaseFolder = path.join(ctx.root, baseFolder);
  const armTemplateFolder = path.join(armBaseFolder, templateFolder);
  const armParameterFolder = path.join(armBaseFolder, parameterFolder);

  const needsBackup = !(await areFoldersEmpty([armTemplateFolder, armParameterFolder]));
  if (needsBackup) {
    const backupFolder = path.join(
      armBaseFolder,
      "backup",
      dateFormat(new Date(), "yyyymmddHHMMssl")
    ); // example: ./infra/azure/backup/20210823080000000
    const templateBackupFolder = path.join(backupFolder, templateFolder);
    const parameterBackupFolder = path.join(backupFolder, parameterFolder);

    await fs.move(armTemplateFolder, templateBackupFolder);
    await fs.move(armParameterFolder, parameterBackupFolder);
  }
}

async function areFoldersEmpty(folderPaths: string[]): Promise<boolean> {
  let isEmpty = true;
  for (const folderPath of folderPaths) {
    if (await fs.pathExists(folderPath)) {
      const files = await fs.readdir(folderPath);
      if (files.length > 0) {
        isEmpty = false;
        break;
      }
    }
  }
  return isEmpty;
}

const FeatureFlagNewFolderStructure = "TEAMSFX_ARM_NEW_FOLDER_STRUCTURE";
function isNewFolderStructureEnabled(): boolean {
  return isFeatureFlagEnabled(FeatureFlagNewFolderStructure, false);
}

async function waitSeconds(second: number) {
  return new Promise((resolve) => setTimeout(resolve, second * 1000));
}

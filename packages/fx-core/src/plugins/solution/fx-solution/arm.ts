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
} from "@microsoft/teamsfx-api";
import { ScaffoldArmTemplateResult, ArmResourcePlugin } from "../../../common/armInterface";
import { getActivatedResourcePlugins } from "./ResourcePluginContainer";
import { getPluginContext } from "./utils/util";
import { format } from "util";
import { compileHandlebarsTemplateString, getStrings } from "../../../common";
import path from "path";
import * as fs from "fs-extra";
import { ConstantString, PluginDisplayName } from "../../../common/constants";
import { Executor } from "../../../common/tools";
import {
  ARM_TEMPLATE_OUTPUT,
  GLOBAL_CONFIG,
  PluginNames,
  RESOURCE_GROUP_NAME,
  SolutionError,
} from "./constants";
import { ResourceManagementClient, ResourceManagementModels } from "@azure/arm-resources";
import { DeployArmTemplatesSteps, ProgressHelper } from "./utils/progressHelper";

const baseFolder = "./infra/azure";
const templateFolder = "templates";
const parameterFolder = "parameters";
const bicepOrchestrationFileName = "main.bicep";
const armTemplateJsonFileName = "main.json";
const parameterTemplateFileName = "parameter.template.json";
const parameterDefaultFileName = "parameter.default.json";
const solutionLevelParameters = `param resourceBaseName string\n`;
const solutionLevelParameterObject = {
  resourceBaseName: {
    value: "{{SOLUTION__RESOURCE_BASE_NAME}}",
  },
};

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
    // Output main.bicep file
    const bicepOrchestrationFileContent = bicepOrchestrationTemplate.getOrchestrationFileContent();
    const templateFolderPath = path.join(ctx.root, baseFolder, templateFolder);
    await fs.ensureDir(templateFolderPath);
    await fs.writeFile(
      path.join(templateFolderPath, bicepOrchestrationFileName),
      bicepOrchestrationFileContent
    );

    // Output bicep module files from each resource plugin
    for (const module of moduleFiles) {
      await fs.writeFile(path.join(templateFolderPath, module[0]), module[1]);
    }

    // Output parameter file
    const parameterFileContent = bicepOrchestrationTemplate.getParameterFileContent();
    const parameterFolderPath = path.join(ctx.root, baseFolder, parameterFolder);
    await fs.ensureDir(parameterFolderPath);
    await fs.writeFile(
      path.join(parameterFolderPath, parameterTemplateFileName),
      parameterFileContent
    );
  }

  return ok(undefined); // Nothing to return when success
}

export async function doDeployArmTemplates(ctx: SolutionContext): Promise<Result<void, FxError>> {
  const progressHandler = await ProgressHelper.startDeployArmTemplatesProgressHandler(
    getPluginContext(ctx, PluginNames.SOLUTION)
  );
  await progressHandler?.next(DeployArmTemplatesSteps.ExecuteDeployment);

  generateResourceName(ctx);

  // update parameters
  const parameterJson = await getParameterJson(ctx);

  const resourceGroupName = ctx.config.get(GLOBAL_CONFIG)?.getString(RESOURCE_GROUP_NAME);
  if (!resourceGroupName) {
    throw new Error("Failed to get resource group from project solution settings.");
  }

  // Compile bicep file to json
  const templateDir = path.join(ctx.root, baseFolder, templateFolder);
  const armTemplateJsonFilePath = path.join(templateDir, armTemplateJsonFileName);
  await compileBicepToJson(
    path.join(templateDir, bicepOrchestrationFileName),
    armTemplateJsonFilePath
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
      template: JSON.parse(await fs.readFile(armTemplateJsonFilePath, ConstantString.UTF8Encoding)),
      mode: "Incremental" as ResourceManagementModels.DeploymentMode,
    },
  };
  let deploymentFinished = false;
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
        ctx.config.get(GLOBAL_CONFIG)?.set(ARM_TEMPLATE_OUTPUT, result.properties?.outputs);
        return result;
      })
      .finally(() => {
        deploymentFinished = true;
      });
    await pollDeploymentStatus(client, resourceGroupName, Date.now());
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
    throw new Error(`Failed to deploy arm templates to azure. Error: ${error.message}`);
  }

  async function pollDeploymentStatus(
    client: ResourceManagementClient,
    resourceGroupName: string,
    deploymentStartTime: number
  ): Promise<void> {
    ctx.logProvider?.info(
      format(
        getStrings().solution.DeployArmTemplates.PollDeploymentStatusNotice,
        PluginDisplayName.Solution
      )
    );

    const waitingTimeSpan = 10000;
    setTimeout(async () => {
      if (!deploymentFinished) {
        const deployments = await client.deployments.listByResourceGroup(resourceGroupName);
        deployments.forEach((deployment) => {
          if (
            deployment.properties?.timestamp &&
            deployment.properties.timestamp.getTime() > deploymentStartTime
          ) {
            ctx.logProvider?.info(
              `[${PluginDisplayName.Solution}] ${deployment.name} -> ${deployment.properties.provisioningState}`
            );
            if (deployment.properties.error) {
              ctx.logProvider?.error(JSON.stringify(deployment.properties.error, undefined, 2));
            }
          }
        });
        pollDeploymentStatus(client, resourceGroupName, deploymentStartTime);
      }
    }, waitingTimeSpan);
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
  await ProgressHelper.endDeployArmTemplatesProgress();
  return result;
}

async function getParameterJson(ctx: SolutionContext) {
  const parameterDir = path.join(ctx.root, baseFolder, parameterFolder);
  const parameterDefaultFilePath = path.join(parameterDir, parameterDefaultFileName);
  const parameterTemplateFilePath = path.join(parameterDir, parameterTemplateFileName);
  let parameterFilePath = parameterDefaultFilePath;
  try {
    await fs.stat(parameterDefaultFilePath);
  } catch (err) {
    ctx.logProvider?.info(
      `[${PluginDisplayName.Solution}] ${parameterDefaultFilePath} does not exist. Try ${parameterTemplateFilePath}.`
    );
    parameterFilePath = parameterTemplateFilePath;
  }
  const parameterJson = await getExpandedParameter(ctx, parameterFilePath);

  if (parameterFilePath === parameterTemplateFilePath) {
    await fs.writeFile(parameterDefaultFilePath, JSON.stringify(parameterJson, undefined, 2));
  }

  return parameterJson;
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
  return `./${moduleFileName}.bicep`;
}

function expandParameterPlaceholders(ctx: SolutionContext, parameterContent: string): string {
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
  const solutionConfig = ctx.config.get(GLOBAL_CONFIG);
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

  return compileHandlebarsTemplateString(parameterContent, availableVariables);
}

function normalizeToEnvName(input: string): string {
  return input.toUpperCase().replace(/-|\./g, "_"); // replace "-" or "." to "_"
}

function generateResourceName(ctx: SolutionContext): void {
  const maxAppNameLength = 10;
  const appName = ctx.projectSettings!.appName;
  const sufix = ctx.config.get(GLOBAL_CONFIG)?.getString("resourceNameSuffix");
  const normalizedAppName = appName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  ctx.config
    .get(GLOBAL_CONFIG)
    ?.set("resource_base_name", normalizedAppName.substr(0, maxAppNameLength) + sufix);
}

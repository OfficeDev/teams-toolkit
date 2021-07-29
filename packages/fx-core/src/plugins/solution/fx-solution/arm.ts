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
import { getPluginContext } from "./util";
import { format } from "util";
import { compileHandlebarsTemplateString, getStrings } from "../../../common";
import path from "path";
import * as fs from "fs-extra";
import { ConstantString } from "../../../common/constants";
import { execAsync } from "../../../common/tools";
import { PluginNames, SolutionError } from "./constants";
import { ResourceManagementClient, ResourceManagementModels } from "@azure/arm-resources";
import { ResultFactory } from "../../resource/aad/results";

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
    value: "{{SOLUTION_RESOURCE_BASE_NAME}}",
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
    if (pluginWithArm.scaffoldArmTemplate) {
      // find method using method name
      const pluginContext = getPluginContext(ctx, pluginWithArm.name);
      const result = (await pluginWithArm.scaffoldArmTemplate(pluginContext)) as Result<
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

export async function deployArmTemplates(ctx: SolutionContext): Promise<Result<void, FxError>> {
  const azureInfraDir = path.join(ctx.root, baseFolder);

  // update parameters
  const parameterTemplate = await fs.readFile(
    path.join(azureInfraDir, parameterFolder, parameterTemplateFileName),
    ConstantString.UTF8Encoding
  );
  const parameterJson = JSON.parse(expandParameterPlaceholders(ctx, parameterTemplate));
  const parameterDefaultFilePath = path.join(
    azureInfraDir,
    parameterFolder,
    parameterDefaultFileName
  );
  await fs.writeFile(parameterDefaultFilePath, parameterJson);
  const resourceGroupName = parameterJson.parameters.resourceBaseName;
  if (!resourceGroupName) {
    throw returnSystemError(
      new Error("Failed to get resource group from parameters."),
      PluginNames.SOLUTION,
      SolutionError.NoResourceGroupFound
    );
  }

  // Compile bicep file to json
  const orchestrationFilePath = path.join(
    azureInfraDir,
    templateFolder,
    bicepOrchestrationFileName
  );
  const armTemplateJsonFilePath = path.join(azureInfraDir, templateFolder, armTemplateJsonFileName);
  await compileBicepToJson(orchestrationFilePath, armTemplateJsonFilePath);
  ctx.logProvider?.info("Successfully compile bicep files to JSON.");

  // deploy arm templates to azure
  const client = await getResourceManagementClientForArmDeployment(ctx);
  const deploymentName = `${PluginNames.SOLUTION}-deployment`;
  const deploymentParameters: ResourceManagementModels.Deployment = {
    properties: {
      parameters: parameterJson,
      template: await fs.readFile(armTemplateJsonFilePath, ConstantString.UTF8Encoding),
      mode: "Incremental" as ResourceManagementModels.DeploymentMode,
    },
  };
  let deploymentFinished = false;
  try {
    const result = await client.deployments
      .createOrUpdate(resourceGroupName, deploymentName, deploymentParameters)
      .then((result) => {
        ctx.logProvider?.info(
          `Successfully deploy arm templates to Azure. Resource group name: ${resourceGroupName}. Deployment name: ${deploymentName}`
        );
        return result;
      })
      .finally(() => {
        deploymentFinished = true;
      });
    pollDeploymentStatus(client, resourceGroupName, Date.now());
    if (!ctx.projectSettings?.solutionSettings) {
      return err(
        returnSystemError(
          new Error("solutionSettings is undefined"),
          PluginNames.SOLUTION,
          SolutionError.InternelError
        )
      );
    }
    ctx.projectSettings.solutionSettings["armTemplateOutput"] = result.properties?.outputs;
    return ResultFactory.Success();
  } catch (error) {
    ctx.logProvider?.info(
      `Failed to deploy arm templates to Azure. Resource group name: ${resourceGroupName}. Deployment name: ${deploymentName}. Error message: ${error.message}`
    );
    return err(
      returnSystemError(
        new Error("Failed to deploy arm templates to azure"),
        PluginNames.SOLUTION,
        SolutionError.FailedToDeployArmTemplatesToAzure
      )
    );
  }

  async function pollDeploymentStatus(
    client: ResourceManagementClient,
    resourceGroupName: string,
    deploymentStartTime: number
  ): Promise<void> {
    ctx.logProvider?.info("polling deployment status...");

    const waitingTimeSpan = 10000;
    setTimeout(async () => {
      if (!deploymentFinished) {
        const deployments = await client.deployments.listByResourceGroup(resourceGroupName);
        deployments.forEach((deployment) => {
          if (
            deployment.properties?.timestamp &&
            deployment.properties.timestamp.getTime() > deploymentStartTime
          ) {
            console.log(
              `[${deployment.properties.timestamp}] ${deployment.name} -> ${deployment.properties.provisioningState}`
            );
            if (deployment.properties.error) {
              console.log(`Error message: ${JSON.stringify(deployment.properties.error, null, 2)}`);
            }
          }
        });
        pollDeploymentStatus(client, resourceGroupName, deploymentStartTime);
      }
    }, waitingTimeSpan);
  }
}
async function getResourceManagementClientForArmDeployment(
  ctx: SolutionContext
): Promise<ResourceManagementClient> {
  const azureToken = await ctx.azureAccountProvider?.getAccountCredentialAsync();
  if (!azureToken) {
    throw returnSystemError(
      new Error("Azure Credential is invalid."),
      PluginNames.SOLUTION,
      SolutionError.FailedToGetAzureCredential
    );
  }

  const subscriptionId = (await ctx.azureAccountProvider?.getSelectedSubscription())
    ?.subscriptionId;
  if (!subscriptionId) {
    throw returnSystemError(
      new Error(`Failed to get subscription id.`),
      PluginNames.SOLUTION,
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
  const { stdout, stderr } = await execAsync(command);
  if (stderr) {
    throw returnSystemError(
      new Error(`Failed to compile bicep files to Json arm templates file: ${stderr}`),
      PluginNames.SOLUTION,
      SolutionError.FailedToCompileBicepFiles
    );
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
    orchestrationTemplate += this.normalizeTemplateSnippet(this.ParameterTemplate, false);
    orchestrationTemplate += this.normalizeTemplateSnippet(this.VariableTemplate, false);
    orchestrationTemplate += this.normalizeTemplateSnippet(this.ModuleTemplate, false);
    orchestrationTemplate += this.normalizeTemplateSnippet(this.OutputTemplate, false);

    return compileHandlebarsTemplateString(orchestrationTemplate, this.RenderContenxt);
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
      return snippet + "\n";
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
  // Add environment variable to available variables
  Object.assign(availableVariables, process.env); // The environment variable has higher priority

  return compileHandlebarsTemplateString(parameterContent, availableVariables);
}

function normalizeToEnvName(input: string): string {
  return input.toUpperCase().replace(/-|\./g, "_"); // replace "-" or "." to "_"
}

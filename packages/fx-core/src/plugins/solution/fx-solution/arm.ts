// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  SolutionContext,
  Plugin,
  Result,
  ok,
  FxError,
} from "@microsoft/teamsfx-api";
import { ScaffoldArmTemplateResult } from "../../../common/armInterface";
import { getActivatedResourcePlugins } from "./ResourcePluginContainer";
import { getPluginContext } from "./util";
import { format } from "util";
import { compileHandlebarsTemplateString, getStrings } from "../../../common";
import path from "path";
import * as fs from "fs-extra";

const baseFolder: string = "./infra/azure";
const templateFolder: string = "templates";
const parameterFolder: string = "parameters";
const bicepOrchestrationFileName: string = "main.bicep";
const parameterTemplateFileName: string = "parameter.template.json";
const scaffoldArmTemplateInterfaceName: string = "scaffoldArmTemplate"; // Temporary solution before adding it to teamsfx-api
const solutionLevelParameters: string = `param resourceBaseName string\n`;

// Get ARM template content from each resource plugin and output to project folder
export async function generateArmTemplate(ctx: SolutionContext): Promise<Result<any, FxError>> {
  const azureSolutionSettings = ctx.projectSettings?.solutionSettings as AzureSolutionSettings;
  const plugins = getActivatedResourcePlugins(azureSolutionSettings); // This function ensures return result won't be empty

  let bicepOrchestrationTemplate = new BicepOrchestrationTemplate(plugins.map((p) => p.name));
  let moduleFiles = new Map<string, string>();

  // Get bicep content from each resource plugin
  for (const plugin of plugins) {
    //@ts-ignore temporary solution before adding related interface to teamsfx-api
    if (plugin[scaffoldArmTemplateInterfaceName]) {
      // find method using method name
      const pluginContext = getPluginContext(ctx, plugin.name);
      //@ts-ignore temporary solution before adding related interface to teamsfx-api
      const result = (await plugin[scaffoldArmTemplateInterfaceName](pluginContext)) as Result<
        ScaffoldArmTemplateResult,
        FxError
      >;
      if (result.isOk()) {
        bicepOrchestrationTemplate.addTemplate(plugin.name, result.value);
        if (result.value.Modules) {
          for (const module of Object.entries(result.value.Modules)) {
            const moduleFileName = module[0];
            const moduleFileContent = module[1].Content;
            moduleFiles.set(generateBicepModuleFilePath(moduleFileName), moduleFileContent);
          }
        }
      } else {
        const msg = format(getStrings().solution.ProvisionFailNotice, ctx.projectSettings?.appName);
        ctx.logProvider?.error(msg);
        return result;
      }
    }
  }

  // Write bicep content to project folder
  if (bicepOrchestrationTemplate.needsGenerateTemplate()) {
    // Output main.bicep file
    const bicepOrchestrationFileContent =
      bicepOrchestrationTemplate.renderOrchestrationFileContent();
    const templateFolderPath = path.join(ctx.root, baseFolder, templateFolder);
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
    await fs.writeFile(
      path.join(parameterFolderPath, parameterTemplateFileName),
      parameterFileContent
    );
  }

  return ok(undefined); // Nothing to return when success
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
    let pluginOutputContext: PluginOutputContext = {
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
class BicepOrchestrationTemplate {
  private ParameterTemplate: string = solutionLevelParameters;
  private VariableTemplate: string = "";
  private ModuleTemplate: string = "";
  private OutputTemplate: string = "";
  private ParameterJsonTemplate: Record<string, unknown> = {};
  private RenderContenxt: ArmTemplateRenderContext;
  private TemplateAdded: boolean = false;

  constructor(pluginNames: string[]) {
    this.RenderContenxt = new ArmTemplateRenderContext(pluginNames);
  }

  public addTemplate(pluginName: string, scaffoldResult: ScaffoldArmTemplateResult): void {
    this.ParameterTemplate += this.normalizeTemplateSnippt(
      scaffoldResult.Orchestration.ParameterTemplate?.Content
    );
    this.VariableTemplate += this.normalizeTemplateSnippt(
      scaffoldResult.Orchestration.VariableTemplate?.Content
    );
    this.ModuleTemplate += this.normalizeTemplateSnippt(
      scaffoldResult.Orchestration.ModuleTemplate?.Content
    );
    this.OutputTemplate += this.normalizeTemplateSnippt(
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

  public renderOrchestrationFileContent(): string {
    let orchestrationTemplate: string = "";
    orchestrationTemplate += this.normalizeTemplateSnippt(this.ParameterTemplate, false);
    orchestrationTemplate += this.normalizeTemplateSnippt(this.VariableTemplate, false);
    orchestrationTemplate += this.normalizeTemplateSnippt(this.ModuleTemplate, false);
    orchestrationTemplate += this.normalizeTemplateSnippt(this.OutputTemplate, false);

    return compileHandlebarsTemplateString(orchestrationTemplate, this.RenderContenxt);
  }

  public getParameterFileContent(): string {
    const parameterObject = {
      $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
      contentVersion: "1.0.0.0",
      parameters: this.ParameterJsonTemplate,
    };
    return JSON.stringify(parameterObject);
  }

  public needsGenerateTemplate(): boolean {
    return this.TemplateAdded;
  }

  private normalizeTemplateSnippt(
    snippet: string | undefined,
    updateTemplateChangeFlag: boolean = true
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

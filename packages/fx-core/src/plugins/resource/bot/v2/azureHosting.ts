// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, ResourceTemplate, Void } from "@microsoft/teamsfx-api";
import { BicepTemplate, Context } from "@microsoft/teamsfx-api/build/v2";
import * as fs from "fs-extra";
import path from "path";
import { BotHostTypes, generateBicepFromFile } from "../../../../common";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep } from "../../../../common/constants";
import { getTemplatesFolder } from "../../../../folder";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import { HostTypes, PluginBot } from "../resources/strings";
import { BicepConfigs } from "./botSolution";
import * as utils from "../utils/common";

export interface BicepFiles {
  provisionOrchestrationFile: string;
  provisionModuleFile: string;
  configOrchestrationFile?: string;
  configModuleFile?: string;
}

export interface BicepModules {
  provisionOrchestration: string;
  provisionModule: string;
  configOrchestration?: string;
  configModule?: string;
}

async function generateBicep(
  bicepFiles: BicepFiles,
  generate: (filename: string) => Promise<string>
): Promise<BicepModules> {
  let filenames = [bicepFiles.provisionOrchestrationFile, bicepFiles.provisionModuleFile];
  if (bicepFiles.configModuleFile && bicepFiles.configOrchestrationFile) {
    filenames = filenames.concat([bicepFiles.configOrchestrationFile, bicepFiles.configModuleFile]);
  }

  const modules = await Promise.all(filenames.map((filename) => generate(filename)));

  return {
    provisionOrchestration: modules[0],
    provisionModule: modules[1],
    configOrchestration: modules?.[2],
    configModule: modules?.[3],
  };
}

export abstract class AzureHosting {
  abstract bicepFolderRelativeDir: string;
  abstract hostType: string;
  abstract configurable: boolean;

  reference: any = undefined;
  pluginId: string;
  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  async generateBicep(ctx: Context, configs: BicepConfigs): Promise<ResourceTemplate> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = {
      plugins: plugins.map((obj) => obj.name),
      configs: configs,
    };

    const bicepFiles: BicepFiles = {
      provisionModuleFile: `${this.hostType}Provision.template.bicep`,
      provisionOrchestrationFile: Bicep.ProvisionFileName,
      configModuleFile: this.configurable
        ? `${this.hostType}Configuration.template.bicep`
        : undefined,
      configOrchestrationFile: this.configurable ? Bicep.ConfigFileName : undefined,
    };

    const bicepTemplateDir = path.join(getTemplatesFolder(), this.bicepFolderRelativeDir);
    const modules = await generateBicep(bicepFiles, async (filename) => {
      const module = await generateBicepFromFile(path.join(bicepTemplateDir, filename), pluginCtx);
      return module.replace(/PluginIdPlaceholder/g, this.pluginId);
    });

    // parameters should be undefined if parameter file does not exist
    let parameters;
    const parameterFilePath = path.join(bicepTemplateDir, Bicep.ParameterFileName);
    if (await fs.pathExists(parameterFilePath)) {
      parameters = await fs.readJson(parameterFilePath);
    }

    return {
      Provision: {
        Orchestration: modules.provisionOrchestration,
        Modules: { [this.hostType]: modules.provisionModule },
      },
      Configuration: this.configurable
        ? {
            Orchestration: modules.configOrchestration,
            Modules: { [this.hostType]: modules.configModule },
          }
        : undefined,
      Reference: this.reference,
      Parameters: parameters,
    } as ResourceTemplate;
  }

  async updateBicep(ctx: Context, configuration: BicepConfigs): Promise<ResourceTemplate> {
    return {} as ArmTemplateResult;
  }
  async configure(ctx: Context): Promise<Void> {
    return Void;
  }
  async deploy(ctx: Context, inputs: Inputs): Promise<Void> {
    return Void;
  }
}

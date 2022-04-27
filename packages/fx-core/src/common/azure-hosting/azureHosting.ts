// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, ResourceTemplate, Void } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import * as fs from "fs-extra";
import path from "path";
import { generateBicepFromFile } from "..";
import { ArmTemplateResult } from "../armInterface";
import { Bicep } from "../constants";
import { getTemplatesFolder } from "../../folder";
import { BicepContext } from "./interfaces";

export abstract class AzureHosting {
  abstract hostType: string;
  abstract configurable: boolean;

  reference: any = undefined;

  private getBicepTemplateFolder(): string {
    return path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "hosting",
      "bicep",
      this.hostType
    );
  }

  async generateBicep(bicepContext: BicepContext, pluginId: string): Promise<ResourceTemplate> {
    // * The order matters.
    // * 0: Provision Orchestration, 1: Provision Module, 2: Configuration Orchestration, 3: Configuration Module
    const bicepFiles = [Bicep.ProvisionFileName, `${this.hostType}Provision.template.bicep`];
    if (this.configurable) {
      bicepFiles.push(Bicep.ConfigFileName);
      bicepFiles.push(`${this.hostType}Configuration.template.bicep`);
    }

    const bicepTemplateDir = this.getBicepTemplateFolder();
    const modules = await Promise.all(
      bicepFiles.map(async (filename) => {
        const module = await generateBicepFromFile(
          path.join(bicepTemplateDir, filename),
          bicepContext
        );
        // TODO: leverage HandleBars to replace plugin id
        return module.replace(/PluginIdPlaceholder/g, pluginId);
      })
    );

    // parameters should be undefined if parameter file does not exist
    let parameters;
    const parameterFilePath = path.join(bicepTemplateDir, Bicep.ParameterFileName);
    if (await fs.pathExists(parameterFilePath)) {
      parameters = await fs.readJson(parameterFilePath);
    }

    return {
      Provision: {
        Orchestration: modules[0],
        Modules: { [this.hostType]: modules[1] },
      },
      Configuration: this.configurable
        ? {
            Orchestration: modules[2],
            Modules: { [this.hostType]: modules[3] },
          }
        : undefined,
      Reference: this.reference,
      Parameters: parameters,
    } as ResourceTemplate;
  }

  async updateBicep(bicepContext: BicepContext, pluginId: string): Promise<ResourceTemplate> {
    return {} as ArmTemplateResult;
  }
  async configure(ctx: Context): Promise<Void> {
    return Void;
  }
  async deploy(ctx: Context, inputs: Inputs): Promise<Void> {
    return Void;
  }
}

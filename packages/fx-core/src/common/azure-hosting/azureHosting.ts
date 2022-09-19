// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ResourceTemplate, TokenProvider, Void } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import * as fs from "fs-extra";
import path from "path";
import { Bicep } from "../constants";
import { getTemplatesFolder } from "../../folder";
import { BicepContext, Logger, ServiceType } from "./interfaces";
import { Messages } from "./messages";
import { getHandlebarContext } from "./utils";
import { generateBicepFromFile } from "../tools";

export abstract class AzureHosting {
  abstract hostType: ServiceType;
  abstract configurable: boolean;

  reference: any = undefined;
  logger?: Logger;

  protected getBicepTemplateFolder(): string {
    return path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "hosting",
      "bicep",
      this.hostType
    );
  }

  async generateBicep(bicepContext: BicepContext): Promise<ResourceTemplate> {
    // * The order matters.
    // * 0: Provision Orchestration, 1: Provision Module, 2: Configuration Orchestration, 3: Configuration Module
    const bicepFiles = [Bicep.ProvisionFileName, `${this.hostType}Provision.template.bicep`];
    if (this.configurable) {
      bicepFiles.push(Bicep.ConfigFileName);
      bicepFiles.push(`${this.hostType}Configuration.template.bicep`);
    }

    const context = getHandlebarContext(bicepContext, this.hostType);

    const bicepTemplateDir = this.getBicepTemplateFolder();
    const modules = await Promise.all(
      bicepFiles.map(
        async (filename) =>
          await generateBicepFromFile(path.join(bicepTemplateDir, filename), context)
      )
    );

    // parameters should be undefined if parameter file does not exist
    let parameters;
    const parameterFilePath = path.join(bicepTemplateDir, Bicep.ParameterFileName);
    if (await fs.pathExists(parameterFilePath)) {
      parameters = await fs.readJson(parameterFilePath);
    }

    this.logger?.info?.(Messages.generateBicep(this.hostType));

    return {
      Provision: {
        Orchestration: modules[0],
        Modules: { [context.moduleName!]: modules[1] },
      },
      Configuration: this.configurable
        ? {
            Orchestration: modules[2],
            Modules: {
              [context.moduleName!]: modules[3],
            },
          }
        : undefined,
      Reference: this.reference,
      Parameters: parameters,
    } as ResourceTemplate;
  }

  async updateBicep(bicepContext: BicepContext): Promise<ResourceTemplate> {
    // * The order matters.
    // * 0: Configuration Orchestration, 1: Configuration Module
    if (!this.configurable) {
      this.logger?.debug?.(Messages.updateBicep(this.hostType));
      return {} as ResourceTemplate;
    }
    const bicepFile = `${this.hostType}Configuration.template.bicep`;
    const context = getHandlebarContext(bicepContext, this.hostType);

    const bicepTemplateDir = this.getBicepTemplateFolder();
    const module = await generateBicepFromFile(path.join(bicepTemplateDir, bicepFile), context);

    this.logger?.info?.(Messages.updateBicep(this.hostType));

    return {
      Configuration: {
        Modules: { [context.moduleName!]: module },
      },
      Reference: this.reference,
    } as ResourceTemplate;
  }

  async configure(ctx: Context): Promise<Void> {
    return Void;
  }

  /**
   * deploy to Azure
   * @param resourceId Azure resource id
   * @param tokenProvider token environment
   * @param buffer zip file stream buffer
   */
  async deploy(resourceId: string, tokenProvider: TokenProvider, buffer: Buffer): Promise<Void> {
    return Void;
  }

  setLogger(logger: any): void {
    this.logger = logger;
  }
}

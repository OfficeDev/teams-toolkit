// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, ResourceTemplate } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import * as fs from "fs-extra";
import path from "path";
import { generateBicepFromFile } from "../../../../common";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep } from "../../../../common/constants";
import { getTemplatesFolder } from "../../../../folder";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import { AppSettings } from "./codeTemplateProvider";

const BicepTemplateRelativeDir = path.join("plugins", "resource", "botv2", "bicep");
const WebAppBicepFolderName = "webapp";
const BotServiceBicepFolderName = "botservice";

const resourceId = "provisionOutputs.botOutput.value.botWebAppResourceId";
const hostName = "provisionOutputs.botOutput.value.validDomain";
const webAppEndpoint = "provisionOutputs.botOutputs.value.botWebAppEndpoint";

interface BicepGenerator {
  generateBicep(ctx: Context, configuration: AppSettings): Promise<ResourceTemplate>;
  updateBicep(ctx: Context, configuration: AppSettings): Promise<ResourceTemplate>;
}

export class WebAppBicepGenerator implements BicepGenerator {
  async generateBicep(ctx: Context, configuration: AppSettings): Promise<ResourceTemplate> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );

    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      BicepTemplateRelativeDir,
      WebAppBicepFolderName
    );
    const bicepFilenames = [
      Bicep.ProvisionFileName,
      "webappProvision.template.bicep",
      Bicep.ConfigFileName,
      "webappConfiguration.template.bicep",
    ];

    const modules = await Promise.all(
      bicepFilenames.map((name) =>
        generateBicepFromFile(path.join(bicepTemplateDir, name), pluginCtx)
      )
    );

    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: modules[0],
        Modules: { webApp: modules[2] },
      },
      Configuration: {
        Orchestration: modules[1],
        Modules: { webApp: modules[3] },
      },
      Reference: {
        resourceId: resourceId,
        hostName: hostName,
        webAppEndpoint: webAppEndpoint,
      },
    };
    return result;
  }

  async updateBicep(ctx: Context, configuration: AppSettings): Promise<ResourceTemplate> {
    return {} as ArmTemplateResult;
  }
}

export class FunctionBicepGenerator implements BicepGenerator {
  async generateBicep(ctx: Context, configuration: AppSettings): Promise<ResourceTemplate> {
    const result: ArmTemplateResult = {
      Provision: {},
      Configuration: {},
      Reference: {},
      Parameters: {},
    };
    return result;
  }

  async updateBicep(ctx: Context, configuration: AppSettings): Promise<ResourceTemplate> {
    return {} as ArmTemplateResult;
  }
}

export class BotServiceBicepGenerator implements BicepGenerator {
  async generateBicep(ctx: Context, configuration: AppSettings): Promise<ResourceTemplate> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );

    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      BicepTemplateRelativeDir,
      BotServiceBicepFolderName
    );
    const bicepFilenames = [Bicep.ProvisionFileName, "botserviceProvision.template.bicep"];

    const modules = await Promise.all(
      bicepFilenames.map((name) =>
        generateBicepFromFile(path.join(bicepTemplateDir, name), pluginCtx)
      )
    );
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: modules[0],
        Modules: { bot: modules[1] },
      },
      Parameters: await fs.readJson(path.join(bicepTemplateDir, Bicep.ParameterFileName)),
    };
    return result;
  }

  async updateBicep(ctx: Context, configuration: AppSettings): Promise<ResourceTemplate> {
    return {} as ArmTemplateResult;
  }
}

export function getGenerators(ctx: Context, inputs: Inputs): BicepGenerator[] {
  // web app hosting or function hosting

  const generators = [];
  generators.push(new BotServiceBicepGenerator());
  generators.push(new WebAppBicepGenerator());
  return generators;
}

export function getDeployment(ctx: Context, inputs: Inputs) {}

export function mergeTemplates(templates: ArmTemplateResult[]): ArmTemplateResult {
  const result: ArmTemplateResult = {
    Provision: {
      Orchestration: templates.map((template) => template.Provision?.Orchestration).join(""),
      Modules: templates
        .map((template) => template.Provision?.Modules)
        .reduce((result, current) => Object.assign(result, current), {}),
    },
    Configuration: {
      Orchestration: templates.map((template) => template.Configuration?.Orchestration).join(""),
      Modules: templates
        .map((template) => template.Configuration?.Modules)
        .reduce((result, current) => Object.assign(result, current), {}),
    },
    Parameters: Object.assign({}, ...templates.map((template) => template.Parameters)),
    Reference: Object.assign({}, ...templates.map((template) => template.Reference)),
  };
  return result;
}

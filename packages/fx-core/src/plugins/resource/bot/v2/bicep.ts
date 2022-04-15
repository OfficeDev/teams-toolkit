// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, ResourceTemplate } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import * as fs from "fs-extra";
import path from "path";
import { BotHostTypes, generateBicepFromFile } from "../../../../common";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep } from "../../../../common/constants";
import { getTemplatesFolder } from "../../../../folder";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import { HostTypes, PluginBot } from "../resources/strings";
import { Configurations } from "./codeTemplateProvider";
import * as utils from "../utils/common";

const BicepTemplateRelativeDir = path.join("plugins", "resource", "botv2", "bicep");
const WebAppBicepFolderName = "webapp";
const FunctionBicepFolderName = "function";
const BotServiceBicepFolderName = "botservice";

const webAppResourceId = "provisionOutputs.webAppOutput.value.resourceId";
const webAppHostName = "provisionOutputs.webAppOutput.value.validDomain";
const functionResourceId = "provisionOutputs.functionOutput.value.resourceId";
const functionHostName = "provisionOutputs.functionOutput.value.validDomain";
const webAppEndpoint = "provisionOutputs.webAppOutputs.value.webAppEndpoint";
const functionEndpoint = "provisionOutputs.functionOutputs.value.functionEndpoint";
const endpointAsParam = "functionProvision.outputs.functionEndpoint";

interface BicepGenerator {
  generateBicep(ctx: Context, configuration: Configurations): Promise<ResourceTemplate>;
  updateBicep(ctx: Context, configuration: Configurations): Promise<ResourceTemplate>;
}

export class WebAppBicepGenerator implements BicepGenerator {
  async generateBicep(ctx: Context, configuration: Configurations): Promise<ResourceTemplate> {
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
      Bicep.ConfigFileName,
      "webappProvision.template.bicep",
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
        resourceId: webAppResourceId,
        hostName: webAppHostName,
        webAppEndpoint: webAppEndpoint,
      },
    };
    return result;
  }

  async updateBicep(ctx: Context, configuration: Configurations): Promise<ResourceTemplate> {
    return {} as ArmTemplateResult;
  }
}

export class FunctionBicepGenerator implements BicepGenerator {
  async generateBicep(ctx: Context, configuration: Configurations): Promise<ResourceTemplate> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSetting).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = {
      plugins: plugins.map((obj) => obj.name),
      configurations: configuration,
    };
    const bicepTemplateDir = path.join(
      getTemplatesFolder(),
      BicepTemplateRelativeDir,
      FunctionBicepFolderName
    );
    const bicepFilenames = [
      Bicep.ProvisionFileName,
      Bicep.ConfigFileName,
      "functionProvision.template.bicep",
      "functionConfiguration.template.bicep",
    ];
    let modules = await Promise.all(
      bicepFilenames.map((name) =>
        generateBicepFromFile(path.join(bicepTemplateDir, name), pluginCtx)
      )
    );
    modules = modules.map((module) => module.replace(/PluginIdPlaceholder/g, "fx-resource-bot"));
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: modules[0],
        Modules: { function: modules[2] },
      },
      Configuration: {
        Orchestration: modules[1],
        Modules: { function: modules[3] },
      },
      Reference: {
        resourceId: functionResourceId,
        hostName: functionHostName,
        functionEndpoint: functionEndpoint,
        endpointAsParam: endpointAsParam,
      },
    };
    return result;
  }

  async updateBicep(ctx: Context, configuration: Configurations): Promise<ResourceTemplate> {
    return {} as ArmTemplateResult;
  }
}

export class BotServiceBicepGenerator implements BicepGenerator {
  async generateBicep(ctx: Context, configuration: Configurations): Promise<ResourceTemplate> {
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

  async updateBicep(ctx: Context, configuration: Configurations): Promise<ResourceTemplate> {
    return {} as ArmTemplateResult;
  }
}

export function getGenerators(ctx: Context, inputs: Inputs): BicepGenerator[] {
  const generators = [];
  const rawHostType = ctx.projectSetting?.pluginSettings?.[PluginBot.PLUGIN_NAME]?.[
    PluginBot.HOST_TYPE
  ] as string;

  const hostType = utils.convertToConstValues(rawHostType, HostTypes);

  if (hostType === BotHostTypes.AppService) {
    generators.push(new WebAppBicepGenerator());
  } else if (hostType === BotHostTypes.AzureFunctions) {
    generators.push(new FunctionBicepGenerator());
  }

  generators.push(new BotServiceBicepGenerator());
  return generators;
}

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

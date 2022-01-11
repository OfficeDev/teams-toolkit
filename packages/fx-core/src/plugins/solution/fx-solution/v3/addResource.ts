// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  err,
  FxError,
  Inputs,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container, Service } from "typedi";
import arm from "../arm";
import { BuiltInResourcePluginNames } from "./constants";
import { ResourceAlreadyAddedError } from "./error";
import { createSelectModuleQuestionNode, selectResourceQuestion } from "../../utils/questions";
import { getModule } from "./utils";
import { InvalidInputError } from "../../utils/error";
@Service(BuiltInResourcePluginNames.storage)
export class AzureStoragePlugin implements v3.ResourcePlugin {
  resourceType = "Azure Storage";
  description = "Azure Storage";
  name = BuiltInResourcePluginNames.storage;
  async generateResourceTemplate(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return ok({
      kind: "bicep",
      template: {
        Provision: {
          Orchestration: "Orchestration",
          Reference: {
            endpoint: "provisionOutputs.azureStorageOutput.value.endpoint",
            domain: "provisionOutputs.azureStorageOutput.value.domain",
          },
          Modules: {
            azureStorage: "",
          },
        },
        Parameters: {
          azureStorageK1: "v1",
        },
      },
    });
  }
  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<v3.CloudResource, FxError>> {
    const config: v3.AzureStorage = {
      domain: "huajie1214dev35e42dtab.z19.web.core.windows.net",
      endpoint: "https://huajie1214dev35e42dtab.z19.web.core.windows.net",
      storageResourceId:
        "/subscriptions/63f43cd3-ab63-429d-80ad-950ec8359724/resourceGroups/fullcap-dev-rg/providers/Microsoft.Storage/storageAccounts/huajie1214dev35e42dtab",
    };
    return ok(config);
  }

  async deploy(
    ctx: v2.Context,
    inputs: v3.PluginDeployInputs,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(`fx-resource-azure-storage deploy success!`);
    return ok(Void);
  }
}
@Service(BuiltInResourcePluginNames.bot)
export class AzureBotPlugin implements v3.ResourcePlugin {
  resourceType = "Azure Bot";
  description = "Azure Bot";
  name = BuiltInResourcePluginNames.bot;
  async generateResourceTemplate(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return ok({
      kind: "bicep",
      template: {
        Provision: {
          Orchestration: "Orchestration",
          Reference: {
            endpoint: "provisionOutputs.azureBotOutput.value.endpoint",
            domain: "provisionOutputs.azureBotOutput.value.domain",
          },
          Modules: {
            azureBot: "",
          },
        },
        Parameters: {
          azureBotK2: "v2",
        },
      },
    });
  }

  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<v3.CloudResource, FxError>> {
    const config: v3.AzureBot = {
      botId: "e01c3709-3700-45dd-9f23-bdbedc78392e",
      objectId: "ea553a03-0322-4c9a-8bd5-8d56d1d2b534",
      skuName: "F1",
      siteName: "huajie1214dev35e42dbot",
      validDomain: "huajie1214dev35e42dbot.azurewebsites.net",
      appServicePlanName: "huajie1214dev35e42dbot",
      botWebAppResourceId:
        "/subscriptions/63f43cd3-ab63-429d-80ad-950ec8359724/resourceGroups/fullcap-dev-rg/providers/Microsoft.Web/sites/huajie1214dev35e42dbot",
      siteEndpoint: "https://huajie1214dev35e42dbot.azurewebsites.net",
      botPassword: "{{fx-resource-bot.botPassword}}",
      secretFields: ["botPassword"],
    };
    return ok(config);
  }

  async deploy(
    ctx: v2.Context,
    inputs: v3.PluginDeployInputs,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(`fx-resource-azure-bot deploy success!`);
    return ok(Void);
  }
}
@Service(BuiltInResourcePluginNames.webApp)
export class AzureWebAppPlugin implements v3.ResourcePlugin {
  resourceType = "Azure Web App";
  description = "Azure Web App";
  name = BuiltInResourcePluginNames.webApp;
  async generateResourceTemplate(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return ok({
      kind: "bicep",
      template: {
        Provision: {
          Orchestration: "Orchestration",
          Reference: {
            endpoint: "provisionOutputs.azureWebAppOutput.value.endpoint",
            domain: "provisionOutputs.azureWebAppOutput.value.domain",
          },
          Modules: {
            azureWebApp: "",
          },
        },
        Parameters: {
          azureWebAppK3: "v3",
        },
      },
    });
  }

  async provisionResource(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<v3.CloudResource, FxError>> {
    const config: v3.CloudResource = {
      resourceId:
        "/subscriptions/63f43cd3-ab63-429d-80ad-950ec8359724/resourceGroups/fullcap-dev-rg/providers/Microsoft.Web/sites/huajie1214dev35e42dbot",
      endpoint: "https://huajie1214dev35e42dbot.azurewebsites.net",
    };
    return ok(config);
  }

  async deploy(
    ctx: v2.Context,
    inputs: v3.PluginDeployInputs,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(`fx-resource-azure-web-app deploy success!`);
    return ok(Void);
  }
}

@Service(BuiltInResourcePluginNames.spfx)
export class SPFxResourcePlugin implements v3.ResourcePlugin {
  resourceType = "SPFx resource";
  description = "SPFx resource";
  name = BuiltInResourcePluginNames.spfx;
  async deploy(
    ctx: v2.Context,
    inputs: v3.PluginDeployInputs,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    ctx.logProvider.info(`fx-resource-spfx deploy success!`);
    return ok(Void);
  }
}

function getAllResourcePlugins(): v3.ResourcePlugin[] {
  return [
    Container.get<v3.ResourcePlugin>(BuiltInResourcePluginNames.webApp),
    Container.get<v3.ResourcePlugin>(BuiltInResourcePluginNames.bot),
    Container.get<v3.ResourcePlugin>(BuiltInResourcePluginNames.webApp),
  ];
}

export async function getQuestionsForAddResource(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const node = new QTreeNode({ type: "group" });
  const moduleNode = createSelectModuleQuestionNode(solutionSettings.modules);
  node.addChild(moduleNode);
  const resourcePlugins = getAllResourcePlugins();
  const resourceNode = new QTreeNode(selectResourceQuestion);
  const staticOptions: OptionItem[] = [];
  for (const plugin of resourcePlugins) {
    staticOptions.push({
      id: plugin.name,
      label: plugin.resourceType,
      detail: plugin.description,
    });
  }
  selectResourceQuestion.staticOptions = staticOptions;
  node.addChild(resourceNode);
  return ok(node);
}
export async function addResource(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { module?: string; resource?: string }
): Promise<Result<Void, FxError>> {
  if (!inputs.resource) {
    return err(new InvalidInputError(inputs, "inputs.resource undefined"));
  }
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  if (inputs.module !== undefined) {
    const module = getModule(solutionSettings, inputs.module);
    if (module) {
      if (module.hostingPlugin === inputs.resource) {
        return err(new ResourceAlreadyAddedError(inputs.resource));
      }
      module.hostingPlugin = inputs.resource;
    }
  }
  // resolve resource dependencies
  const addedResourceNames = new Set<string>();
  const existingResourceNames = new Set<string>();
  const allResourceNames = new Set<string>();
  solutionSettings.activeResourcePlugins.forEach((s) => existingResourceNames.add(s));
  addedResourceNames.add(inputs.resource);
  const resolveRes = await resolveResourceDependencies(ctx, inputs, addedResourceNames);
  if (resolveRes.isErr()) return err(resolveRes.error);
  addedResourceNames.forEach((s) => allResourceNames.add(s));
  existingResourceNames.forEach((s) => allResourceNames.add(s));
  solutionSettings.activeResourcePlugins = Array.from(allResourceNames);

  //call arm module to generate arm templates
  const activatedPlugins = solutionSettings.activeResourcePlugins.map((n) =>
    Container.get<v3.ResourcePlugin>(n)
  );
  const addedPlugins = Array.from(addedResourceNames).map((n) =>
    Container.get<v3.ResourcePlugin>(n)
  );
  const armRes = await arm.generateArmTemplate(ctx, inputs, activatedPlugins, addedPlugins);
  if (armRes.isErr()) {
    return err(armRes.error);
  }

  //call addResource API
  for (const pluginName of allResourceNames.values()) {
    const plugin = Container.get<v3.ResourcePlugin>(pluginName);
    if (addedResourceNames.has(pluginName) && !existingResourceNames.has(pluginName)) {
      if (plugin.addResource) {
        const res = await plugin.addResource(ctx, inputs);
        if (res.isErr()) {
          return err(res.error);
        }
      }
    }
  }
  return ok(Void);
}

async function resolveResourceDependencies(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { module?: string; resource?: string },
  addedResourceNames: Set<string>
): Promise<Result<undefined, FxError>> {
  while (true) {
    const size1 = addedResourceNames.size;
    for (const name of addedResourceNames) {
      const plugin = Container.get<v3.ResourcePlugin>(name);
      if (plugin.pluginDependencies) {
        const depRes = await plugin.pluginDependencies(ctx, inputs);
        if (depRes.isErr()) {
          return err(depRes.error);
        }
        for (const dep of depRes.value) {
          addedResourceNames.add(dep);
        }
      }
    }
    const size2 = addedResourceNames.size;
    if (size1 === size2) break;
  }
  return ok(undefined);
}

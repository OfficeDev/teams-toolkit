// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  FxError,
  Inputs,
  Json,
  ok,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { Service } from "typedi";
import { getModule } from "../../../src/plugins/solution/fx-solution/v3/utils";

export const MockScaffoldPluginNames = {
  tab: "fx-scaffold-test-tab",
  bot: "fx-scaffold-test-bot",
};

export const MockResourcePluginNames = {
  storage: "fx-resource-test-storage",
};

@Service(MockScaffoldPluginNames.tab)
export class MockTabScaffoldPlugin implements v3.ScaffoldPlugin {
  type: "scaffold" = "scaffold";
  async getTemplates(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<v3.ScaffoldTemplate[], FxError>> {
    return ok([
      {
        name: "ReactTab_JS",
        language: "javascript",
        description: "ReactTab Javascript",
      },
      {
        name: "ReactTab_TS",
        language: "typescript",
        description: "ReactTab Typescript",
      },
    ]);
  }
  async scaffold(
    ctx: v2.Context,
    inputs: v3.PluginScaffoldInputs
  ): Promise<Result<Json | undefined, FxError>> {
    if (!inputs.test) await fs.ensureDir(path.join(inputs.projectPath, "tabs"));
    const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
    const module = getModule(solutionSettings, inputs.module);
    if (module) {
      module.dir = "tabs";
      module.deployType = "folder";
    }
    return ok(undefined);
  }
  name = MockScaffoldPluginNames.tab;
}

@Service(MockScaffoldPluginNames.bot)
export class MockBotScaffoldPlugin implements v3.ScaffoldPlugin {
  type: "scaffold" = "scaffold";
  async getTemplates(
    ctx: v2.Context,
    inputs: Inputs
  ): Promise<Result<v3.ScaffoldTemplate[], FxError>> {
    return ok([
      {
        name: "NodejsBot_JS",
        language: "javascript",
        description: "NodejsBot JS",
      },
      {
        name: "NodejsBot_TS",
        language: "typescript",
        description: "NodejsBot TS",
      },
    ]);
  }

  async scaffold(
    ctx: v2.Context,
    inputs: v3.PluginScaffoldInputs
  ): Promise<Result<Json | undefined, FxError>> {
    const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
    const module = getModule(solutionSettings, inputs.module);
    if (module) {
      module.dir = "bot";
      module.deployType = "zip";
    }
    return ok(undefined);
  }
  name = MockScaffoldPluginNames.bot;
}

const MockStorageResourceTemplate: v2.ResourceTemplate = {
  kind: "bicep",
  template: {
    Provision: {
      Orchestration: "azureStorage Orchestration",
      Reference: {
        endpoint: "provisionOutputs.azureStorageOutput.value.endpoint",
        domain: "provisionOutputs.azureStorageOutput.value.domain",
      },
      Modules: {
        azureStorage: "azureStorage Module",
      },
    },
    Parameters: {
      azureStorageK1: "v1",
    },
  },
};

@Service(MockResourcePluginNames.storage)
export class MockStoragePlugin implements v3.ResourcePlugin {
  type: "resource" = "resource";
  resourceType = "Azure Storage";
  description = "Azure Storage";
  name = MockResourcePluginNames.storage;
  async generateResourceTemplate(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<v2.ResourceTemplate, FxError>> {
    return ok(MockStorageResourceTemplate);
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

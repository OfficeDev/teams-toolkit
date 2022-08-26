// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as faker from "faker";
import {
  AzureAccountProvider,
  ConfigMap,
  PluginContext,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import { v4 as uuid } from "uuid";
import { DependentPluginInfo } from "../../../../src/plugins/resource/frontend/dotnet/constants";
import { newEnvInfo } from "../../../../src";
import { LocalCrypto } from "../../../../src/core/crypto";
import { DotnetPluginInfo as PluginInfo } from "../../../../src/plugins/resource/frontend/dotnet/constants";
import { MyTokenCredential } from "../bot/unit/utils";

export class TestHelper {
  static appName = "ut";
  static rgName = "app-test-rg";
  static location = "eastus2";
  static rootDir: string = faker.system.directoryPath();
  static subscriptionId: string = faker.datatype.uuid();
  static blazorLanguage = "csharp";
  static clientId: string = faker.datatype.uuid();
  static resourceNameSuffix: string = faker.datatype.uuid().substr(0, 6);
  static appServicePlanId = faker.internet.url();
  static webAppDomain = faker.internet.domainName();
  static publishingProfile = {
    publishingUserName: faker.lorem.word(),
    publishingPassword: faker.internet.password(),
  } as any;

  static azureAccountProvider: AzureAccountProvider = {
    getIdentityCredentialAsync: async () => {
      return new MyTokenCredential();
    },
    getSelectedSubscription: async () => {
      return {
        subscriptionId: "subscriptionId",
        tenantId: "tenantId",
        subscriptionName: "subscriptionName",
      };
    },
  } as AzureAccountProvider;

  static getFakePluginContext(): PluginContext {
    const solutionConfig = new Map([
      [DependentPluginInfo.subscriptionId, TestHelper.subscriptionId],
      [DependentPluginInfo.resourceGroupName, TestHelper.rgName],
    ]);

    const pluginContext = {
      azureAccountProvider: TestHelper.azureAccountProvider,
      envInfo: newEnvInfo(
        undefined,
        undefined,
        new Map([[DependentPluginInfo.solutionPluginName, solutionConfig]])
      ),
      projectSettings: {
        appName: TestHelper.appName,
        projectId: uuid(),
        programmingLanguage: TestHelper.blazorLanguage,
        solutionSettings: {
          name: "",
          version: "",
          capabilities: ["Tab"],
          activeResourcePlugins: [PluginInfo.pluginName],
        },
      },
      config: new ConfigMap(),
      app: {
        name: {
          short: TestHelper.appName,
        },
      } as TeamsAppManifest,
      root: TestHelper.rootDir,
      cryptoProvider: new LocalCrypto(""),
    } as PluginContext;

    return pluginContext;
  }
}

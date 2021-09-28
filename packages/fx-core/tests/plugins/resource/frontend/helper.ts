// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as faker from "faker";
import { ApplicationTokenCredentials, TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import {
  AzureAccountProvider,
  ConfigMap,
  PluginContext,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import { v4 as uuid } from "uuid";

import { AzureStorageClient } from "../../../../src/plugins/resource/frontend/clients";
import { DependentPluginInfo } from "../../../../src/plugins/resource/frontend/constants";
import { FrontendConfig } from "../../../../src/plugins/resource/frontend/configs";
import { StorageAccountsCreateResponse } from "@azure/arm-storage/esm/models";
import { newEnvInfo } from "../../../../src";

export class TestHelper {
  static appName = "app-test";
  static rgName = "app-test-rg";
  static location = "eastus2";
  static rootDir: string = faker.system.directoryPath();
  static storageSuffix: string = uuid().substr(0, 6);
  static storageEndpoint: string = faker.internet.url();
  static functionDefaultEntry = "httpTrigger";
  static functionEndpoint: string = faker.internet.url();
  static runtimeEndpoint: string = faker.internet.url();
  static localTabEndpoint: string = faker.internet.url();
  static startLoginPage = "auth-start.html";
  static fakeCredential: TokenCredentialsBase = new ApplicationTokenCredentials(
    faker.datatype.uuid(),
    faker.internet.url(),
    faker.internet.password()
  );
  static fakeSubscriptionId: string = faker.datatype.uuid();
  static tabLanguage = "javascript";
  static fakeClientId: string = faker.datatype.uuid();

  static storageAccount = {
    primaryEndpoints: {
      web: TestHelper.storageEndpoint,
    },
  } as StorageAccountsCreateResponse;

  static fakeAzureAccountProvider: AzureAccountProvider = {
    getAccountCredentialAsync: async () => {
      return TestHelper.fakeCredential;
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
      [DependentPluginInfo.SubscriptionId, TestHelper.fakeSubscriptionId],
      [DependentPluginInfo.ResourceNameSuffix, TestHelper.storageSuffix],
      [DependentPluginInfo.ResourceGroupName, TestHelper.rgName],
      [DependentPluginInfo.Location, TestHelper.location],
      [DependentPluginInfo.ProgrammingLanguage, TestHelper.tabLanguage],
    ]);

    const functionConfig = new Map<string, string>([
      [DependentPluginInfo.FunctionEndpoint, TestHelper.functionEndpoint],
    ]);

    const runtimeConfig = new Map<string, string>([
      [DependentPluginInfo.RuntimeEndpoint, TestHelper.runtimeEndpoint],
      [DependentPluginInfo.StartLoginPageURL, TestHelper.startLoginPage],
    ]);

    const aadConfig = new Map<string, string>([
      [DependentPluginInfo.ClientID, TestHelper.fakeClientId],
    ]);

    const localDebugConfig = new Map();
    localDebugConfig.set(DependentPluginInfo.LocalTabEndpoint, TestHelper.localTabEndpoint);

    const pluginContext = {
      azureAccountProvider: TestHelper.fakeAzureAccountProvider,
      envInfo: newEnvInfo(
        undefined,
        undefined,
        new Map([
          [DependentPluginInfo.SolutionPluginName, solutionConfig],
          [DependentPluginInfo.FunctionPluginName, functionConfig],
          [DependentPluginInfo.RuntimePluginName, runtimeConfig],
          [DependentPluginInfo.AADPluginName, aadConfig],
          [DependentPluginInfo.LocalDebugPluginName, localDebugConfig],
        ])
      ),
      projectSettings: {
        appName: TestHelper.appName,
        defaultFunctionName: TestHelper.functionDefaultEntry,
        projectId: uuid(),
        solutionSettings: {
          name: "",
          version: "",
          activeResourcePlugins: [
            DependentPluginInfo.AADPluginName,
            DependentPluginInfo.LocalDebugPluginName,
            DependentPluginInfo.FunctionPluginName,
            DependentPluginInfo.RuntimePluginName,
          ],
        },
      },
      config: new ConfigMap(),
      app: {
        name: {
          short: TestHelper.appName,
        },
      } as TeamsAppManifest,
      root: TestHelper.rootDir,
    } as PluginContext;

    return pluginContext;
  }

  static async getFakeFrontendConfig(ctx: PluginContext): Promise<FrontendConfig> {
    return FrontendConfig.fromPluginContext(ctx);
  }

  static async getFakeAzureStorageClient(ctx?: PluginContext): Promise<AzureStorageClient> {
    ctx ??= TestHelper.getFakePluginContext();
    const config = await TestHelper.getFakeFrontendConfig(ctx);
    return new AzureStorageClient(config);
  }
}

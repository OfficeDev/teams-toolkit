// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as faker from "faker";
import { ApplicationTokenCredentials, TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import {
  AzureAccountProvider,
  LogLevel,
  LogProvider,
  ConfigMap,
  PluginContext,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import { v4 as uuid } from "uuid";

import { AxiosResponse } from "axios";
import { AzureStorageClient } from "../../../../src/plugins/resource/frontend/clients";
import { DependentPluginInfo } from "../../../../src/plugins/resource/frontend/constants";
import { FrontendConfig } from "../../../../src/plugins/resource/frontend/configs";
import * as templates from "../../../../src/common/templates";
import { StorageAccountsCreateResponse } from "@azure/arm-storage/esm/models";

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

  static fakeLogProvider: LogProvider = {
    async log(logLevel: LogLevel, message: string): Promise<boolean> {
      return true;
    },
    async trace(message: string): Promise<boolean> {
      return true;
    },
    async debug(message: string): Promise<boolean> {
      return true;
    },
    async info(message: string | Array<any>): Promise<boolean> {
      return true;
    },
    async warning(message: string): Promise<boolean> {
      return true;
    },
    async error(message: string): Promise<boolean> {
      return true;
    },
    async fatal(message: string): Promise<boolean> {
      return true;
    },
  };

  static getFakePluginContext(): PluginContext {
    const solutionConfig = new Map();
    solutionConfig.set(DependentPluginInfo.ResourceNameSuffix, TestHelper.storageSuffix);
    solutionConfig.set(DependentPluginInfo.ResourceGroupName, TestHelper.rgName);
    solutionConfig.set(DependentPluginInfo.Location, TestHelper.location);
    solutionConfig.set(DependentPluginInfo.ProgrammingLanguage, TestHelper.tabLanguage);

    const functionConfig = new Map();
    functionConfig.set(DependentPluginInfo.FunctionDefaultName, TestHelper.functionDefaultEntry);
    functionConfig.set(DependentPluginInfo.FunctionEndpoint, TestHelper.functionEndpoint);

    const runtimeConfig = new Map();
    runtimeConfig.set(DependentPluginInfo.RuntimeEndpoint, TestHelper.runtimeEndpoint);
    runtimeConfig.set(DependentPluginInfo.StartLoginPageURL, TestHelper.startLoginPage);

    const aadConfig = new Map();
    aadConfig.set(DependentPluginInfo.ClientID, TestHelper.fakeClientId);

    const localDebugConfig = new Map();
    localDebugConfig.set(DependentPluginInfo.LocalTabEndpoint, TestHelper.localTabEndpoint);

    const pluginContext = {
      azureAccountProvider: TestHelper.fakeAzureAccountProvider,
      logProvider: TestHelper.fakeLogProvider,
      configOfOtherPlugins: new Map([
        [DependentPluginInfo.SolutionPluginName, solutionConfig],
        [DependentPluginInfo.FunctionPluginName, functionConfig],
        [DependentPluginInfo.RuntimePluginName, runtimeConfig],
        [DependentPluginInfo.AADPluginName, aadConfig],
        [DependentPluginInfo.LocalDebugPluginName, localDebugConfig],
      ]),
      projectSettings: {
        appName: TestHelper.appName,
        currentEnv: "default",
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

  static candidateTag = templates.tagPrefix + templates.templatesVersion.replace(/\*/g, "0");
  static targetTag = templates.tagPrefix + templates.templatesVersion.replace(/\*/g, "1");
  static templateCompose = "a.b.c";
  static latestTemplateURL: string = templates.templateURL(
    TestHelper.targetTag,
    TestHelper.templateCompose
  );

  static getFakeAxiosResponse(data: any, status = 200): AxiosResponse<any> {
    return {
      status: status,
      data: data,
      statusText: "OK",
      config: {},
      headers: {},
    };
  }

  static getFakeTemplateManifest(): string {
    return `
templates@0.2.0
templates@0.1.1
templates@0.1.1-alpha
templates@0.2.1
templates@0.3.1
${TestHelper.candidateTag}
${TestHelper.targetTag}
`;
  }
}

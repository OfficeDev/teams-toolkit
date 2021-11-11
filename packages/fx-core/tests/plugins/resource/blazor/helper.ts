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
import { DependentPluginInfo } from "../../../../src/plugins/resource/frontend/blazor/constants";
import { newEnvInfo } from "../../../../src";
import { LocalCrypto } from "../../../../src/core/crypto";
import { BlazorPluginInfo } from "../../../../src/plugins/resource/frontend/blazor/constants";

export class TestHelper {
  static appName = "ut";
  static rgName = "app-test-rg";
  static location = "eastus2";
  static rootDir: string = faker.system.directoryPath();
  static credential: TokenCredentialsBase = new ApplicationTokenCredentials(
    faker.datatype.uuid(),
    faker.internet.url(),
    faker.internet.password()
  );
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
    getAccountCredentialAsync: async () => {
      return TestHelper.credential;
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
      [DependentPluginInfo.resourceNameSuffix, TestHelper.resourceNameSuffix],
      [DependentPluginInfo.resourceGroupName, TestHelper.rgName],
      [DependentPluginInfo.location, TestHelper.location],
    ]);

    const aadConfig = new Map<string, string>([
      [DependentPluginInfo.clientID, faker.datatype.uuid()],
      [DependentPluginInfo.aadClientSecret, faker.internet.password()],
      [DependentPluginInfo.oauthHost, faker.internet.url()],
      [DependentPluginInfo.tenantId, faker.datatype.uuid()],
      [DependentPluginInfo.applicationIdUris, faker.internet.url()],
    ]);

    const botConfig = new Map<string, string>([
      [DependentPluginInfo.botId, faker.datatype.uuid()],
      [DependentPluginInfo.botPassword, faker.internet.password()],
    ]);

    const pluginContext = {
      azureAccountProvider: TestHelper.azureAccountProvider,
      envInfo: newEnvInfo(
        undefined,
        undefined,
        new Map([
          [DependentPluginInfo.solutionPluginName, solutionConfig],
          [DependentPluginInfo.aadPluginName, aadConfig],
          [DependentPluginInfo.botPluginName, botConfig],
        ])
      ),
      projectSettings: {
        appName: TestHelper.appName,
        projectId: uuid(),
        solutionSettings: {
          name: "",
          version: "",
          activeResourcePlugins: [
            DependentPluginInfo.aadPluginName,
            BlazorPluginInfo.pluginName,
            DependentPluginInfo.botPluginName,
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
      cryptoProvider: new LocalCrypto(""),
    } as PluginContext;

    return pluginContext;
  }
}

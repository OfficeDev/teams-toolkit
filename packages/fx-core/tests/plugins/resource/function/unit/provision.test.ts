// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import { DependentPluginInfo } from "../../../../../src/plugins/resource/function/constants";
import { Platform } from "@microsoft/teamsfx-api";
import { newEnvInfo } from "../../../../../src";

const context: any = {
  envInfo: newEnvInfo(
    undefined,
    undefined,
    new Map<string, Map<string, string | string[]>>([
      [
        DependentPluginInfo.solutionPluginName,
        new Map<string, string | string[]>([
          [DependentPluginInfo.resourceGroupName, "ut"],
          [DependentPluginInfo.subscriptionId, "ut"],
          [DependentPluginInfo.resourceNameSuffix, "ut"],
          [DependentPluginInfo.location, "ut"],
        ]),
      ],
      [
        DependentPluginInfo.aadPluginName,
        new Map<string, string>([
          [DependentPluginInfo.aadClientId, "ut"],
          [DependentPluginInfo.aadClientSecret, "ut"],
          [DependentPluginInfo.oauthHost, "ut"],
          [DependentPluginInfo.tenantId, "ut"],
          [DependentPluginInfo.applicationIdUris, "ut"],
        ]),
      ],
      [
        DependentPluginInfo.frontendPluginName,
        new Map<string, string>([
          [DependentPluginInfo.frontendDomain, "ut"],
          [DependentPluginInfo.frontendEndpoint, "ut"],
        ]),
      ],
      [
        DependentPluginInfo.identityPluginName,
        new Map<string, string>([
          [DependentPluginInfo.identityClientId, "ut"],
          [DependentPluginInfo.identityResourceId, "ut"],
        ]),
      ],
      [
        DependentPluginInfo.sqlPluginName,
        new Map<string, string>([
          [DependentPluginInfo.sqlPluginName, "ut"],
          [DependentPluginInfo.sqlEndpoint, "ut"],
          [DependentPluginInfo.databaseName, "ut"],
        ]),
      ],
      [
        DependentPluginInfo.apimPluginName,
        new Map<string, string>([[DependentPluginInfo.apimAppId, "ut"]]),
      ],
    ])
  ),
  app: {
    name: {
      short: "ut",
    },
  },
  config: new Map<string, string>(),
  projectSettings: {
    appName: "ut",
    programmingLanguage: "javascript",
    solutionSettings: {
      activeResourcePlugins: [
        DependentPluginInfo.aadPluginName,
        DependentPluginInfo.frontendPluginName,
        DependentPluginInfo.identityPluginName,
        DependentPluginInfo.sqlPluginName,
        DependentPluginInfo.apimPluginName,
      ],
    },
  },
  azureAccountProvider: {
    getAccountCredentialAsync: async () => ({
      signRequest: () => {
        return;
      },
    }),
    getSelectedSubscription: async () => {
      return {
        subscriptionId: "subscriptionId",
        tenantId: "tenantId",
        subscriptionName: "subscriptionName",
      };
    },
  },
  root: __dirname,
  answers: { platform: Platform.VSCode },
};

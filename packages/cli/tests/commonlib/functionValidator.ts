// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import * as chai from "chai";
import glob from "glob";
import path from "path";
import MockAzureAccountProvider from "../../src/commonlib/azureLoginUserPassword";
import { StateConfigKey, PluginId } from "./constants";
import {
  getSubscriptionIdFromResourceId,
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getWebappSettings,
  runWithRetry,
  getWebappConfigs,
} from "./utilities";

const baseUrlListDeployments = (subscriptionId: string, rg: string, name: string) =>
  `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/deployments?api-version=2019-08-01`;
const baseUrlListDeploymentLogs = (subscriptionId: string, rg: string, name: string, id: string) =>
  `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/deployments/${id}/log?api-version=2019-08-01`;

enum BaseConfig {
  M365_CLIENT_ID = "M365_CLIENT_ID",
  M365_CLIENT_SECRET = "M365_CLIENT_SECRET",
  M365_AUTHORITY_HOST = "M365_AUTHORITY_HOST",
  M365_TENANT_ID = "M365_TENANT_ID",
  ALLOWED_APP_IDS = "ALLOWED_APP_IDS",
  API_ENDPOINT = "API_ENDPOINT",
  M365_APPLICATION_ID_URI = "M365_APPLICATION_ID_URI",
  IDENTITY_ID = "IDENTITY_ID",
}

enum SQLConfig {
  SQL_DATABASE_NAME = "SQL_DATABASE_NAME",
  SQL_ENDPOINT = "SQL_ENDPOINT",
}

export class FunctionValidator {
  private subscriptionId: string;
  private rg: string;
  private activeResourcePlugins: string[];
  private ctx: any;
  private functionAppName: string;
  private resourceBaseName: string;

  constructor(ctx: any, activeResourcePlugins: string[], resourceBaseName: string) {
    const resourceId = ctx[PluginId.Function][StateConfigKey.functionAppResourceId];
    this.subscriptionId = getSubscriptionIdFromResourceId(resourceId);
    this.rg = getResourceGroupNameFromResourceId(resourceId);
    this.activeResourcePlugins = activeResourcePlugins;
    this.ctx = ctx;
    this.resourceBaseName = resourceBaseName;
    this.functionAppName = getSiteNameFromResourceId(resourceId);
  }

  public async validateScaffold(projectPath: string, programmingLanguage: string): Promise<void> {
    const indexFile: { [key: string]: string } = {
      typescript: "index.ts",
      javascript: "index.js",
    };
    glob(
      `**/${indexFile[programmingLanguage]}`,
      { cwd: path.resolve(projectPath, "api") },
      (err, files) => {
        chai.assert.isAtLeast(files.length, 1);
      }
    );
  }

  public async validateProvision(): Promise<void> {
    console.log("Start to validate Function Provision.");

    const tokenProvider = MockAzureAccountProvider;
    const tokenCredential = await tokenProvider.getAccountCredentialAsync();
    const token = (await tokenCredential?.getToken())?.accessToken;

    // Validating app settings
    console.log("validating app settings.");
    const webappSettingsResponse = await getWebappSettings(
      this.subscriptionId,
      this.rg,
      this.functionAppName,
      token as string
    );
    chai.assert.exists(webappSettingsResponse);
    console.log("[dilin-debug] webappSettingsResponse: " + JSON.stringify(webappSettingsResponse));
    console.log("[dilin-debug] ctx: " + JSON.stringify(this.ctx));
    chai.assert.equal(
      webappSettingsResponse[BaseConfig.API_ENDPOINT],
      this.ctx[PluginId.Function][StateConfigKey.functionEndpoint] as string
    );
    chai.assert.equal(
      webappSettingsResponse[BaseConfig.M365_APPLICATION_ID_URI],
      this.getExpectedM365ApplicationIdUri(this.ctx, this.activeResourcePlugins)
    );
    chai.assert.equal(
      webappSettingsResponse[BaseConfig.M365_CLIENT_SECRET],
      this.getM365ClientSecret(this.ctx, this.activeResourcePlugins, this.resourceBaseName)
    );
    chai.assert.equal(
      webappSettingsResponse[BaseConfig.IDENTITY_ID],
      this.ctx[PluginId.Identity][StateConfigKey.identityClientId] as string
    );
    if (this.activeResourcePlugins.includes(PluginId.AzureSQL)) {
      chai.assert.equal(
        webappSettingsResponse[SQLConfig.SQL_ENDPOINT],
        this.ctx[PluginId.AzureSQL][StateConfigKey.sqlEndpoint] as string
      );
      chai.assert.equal(
        webappSettingsResponse[SQLConfig.SQL_DATABASE_NAME],
        this.ctx[PluginId.AzureSQL][StateConfigKey.databaseName] as string
      );
    }

    // validate app config with allowedOrigins
    if (this.activeResourcePlugins.includes(PluginId.FrontendHosting)) {
      console.log("validating app config.");
      const webAppConfigResponse = await getWebappConfigs(
        this.subscriptionId,
        this.rg,
        this.functionAppName,
        token as string
      );
      console.log("[dilin-debug] webAppConfigResponse: " + JSON.stringify(webAppConfigResponse));

      chai.assert.exists(webAppConfigResponse!.cors!.allowedOrigins);
      chai.assert.isArray(webAppConfigResponse!.cors!.allowedOrigins);
      chai
        .expect(webAppConfigResponse!.cors!.allowedOrigins)
        .to.includes(this.ctx[PluginId.FrontendHosting][StateConfigKey.endpoint]);
    }

    console.log("Successfully validate Function Provision.");
  }

  public async validateDeploy(): Promise<void> {
    console.log("Start to validate Function Deployment.");

    // Disable validate deployment since we have too many requests and the test is not stable.
    const tokenCredential = await MockAzureAccountProvider.getAccountCredentialAsync();
    const token = (await tokenCredential?.getToken())?.accessToken;

    const deployments = await this.getDeployments(
      this.subscriptionId,
      this.rg,
      this.functionAppName,
      token as string
    );
    const deploymentId = deployments?.[0]?.properties?.id;
    const deploymentLog = await this.getDeploymentLog(
      this.subscriptionId,
      this.rg,
      this.functionAppName,
      token as string,
      deploymentId!
    );

    chai.assert.exists(
      deploymentLog?.find((item: any) => item.properties.message === "Deployment successful.")
    );

    console.log("Successfully validate Function Deployment.");
  }

  private async getDeployments(subscriptionId: string, rg: string, name: string, token: string) {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const functionGetResponse = await runWithRetry(() =>
        axios.get(baseUrlListDeployments(subscriptionId, rg, name))
      );

      return functionGetResponse?.data?.value;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  private async getDeploymentLog(
    subscriptionId: string,
    rg: string,
    name: string,
    token: string,
    id: string
  ) {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const functionGetResponse = await runWithRetry(() =>
        axios.get(baseUrlListDeploymentLogs(subscriptionId, rg, name, id))
      );

      return functionGetResponse?.data?.value;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  private getExpectedM365ApplicationIdUri(ctx: any, activeResourcePlugins: string[]): string {
    let expectedM365ApplicationIdUri = "";
    if (activeResourcePlugins.includes(PluginId.FrontendHosting)) {
      const tabDomain = ctx[PluginId.Aad][StateConfigKey.domain];
      const m365ClientId = ctx[PluginId.Aad][StateConfigKey.clientId];
      expectedM365ApplicationIdUri =
        `api://${tabDomain}/` +
        (activeResourcePlugins.includes(PluginId.Bot)
          ? `botid-${ctx[PluginId.Bot][StateConfigKey.botId]}`
          : `${m365ClientId}`);
    } else if (activeResourcePlugins.includes(PluginId.Bot)) {
      expectedM365ApplicationIdUri = `api://botid-${ctx[PluginId.Bot][StateConfigKey.botId]}`;
    }
    console.log("[dilin-debug] expectedM365ApplicationIdUri: " + expectedM365ApplicationIdUri);
    return expectedM365ApplicationIdUri;
  }

  private getM365ClientSecret(
    ctx: any,
    activeResourcePlugins: string[],
    resourceBaseName: string
  ): string {
    let m365ClientSecret = "";
    if (activeResourcePlugins.includes(PluginId.KeyVault)) {
      m365ClientSecret = `@Microsoft.KeyVault(VaultName=${resourceBaseName};SecretName=m365ClientSecret`;
    } else {
      m365ClientSecret = ctx[PluginId.Aad][StateConfigKey.clientSecret];
    }
    console.log("[dilin-debug] m365ClientSecret: " + m365ClientSecret);

    return m365ClientSecret;
  }
}

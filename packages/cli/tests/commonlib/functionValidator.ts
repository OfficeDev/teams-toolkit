// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureScopes } from "@microsoft/teamsfx-core/build/common/tools";
import axios from "axios";
import * as chai from "chai";
import glob from "glob";
import path from "path";
import MockAzureAccountProvider from "../../src/commonlib/azureLoginUserPassword";
import { getActivePluginsFromProjectSetting } from "../e2e/commonUtils";
import { StateConfigKey, PluginId, EnvConstants } from "./constants";
import {
  getSubscriptionIdFromResourceId,
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getWebappSettings,
  runWithRetry,
  getWebappConfigs,
  getExpectedM365ApplicationIdUri,
  getExpectedM365ClientSecret,
} from "./utilities";
import { isV3Enabled } from "@microsoft/teamsfx-core/src/common/tools";

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
  private ctx: any;
  private projectPath: string;
  private env: string;

  private subscriptionId: string;
  private rg: string;
  private functionAppName: string;

  constructor(ctx: any, projectPath: string, env: string) {
    console.log("Start to init validator for function.");

    this.ctx = ctx;
    this.projectPath = projectPath;
    this.env = env;

    const resourceId =
      ctx[EnvConstants.FUNCTION_ID] ?? ctx[PluginId.Function][StateConfigKey.functionAppResourceId];
    chai.assert.exists(resourceId);
    this.subscriptionId = getSubscriptionIdFromResourceId(resourceId);
    chai.assert.exists(this.subscriptionId);
    this.rg = getResourceGroupNameFromResourceId(resourceId);
    chai.assert.exists(this.rg);
    this.functionAppName = getSiteNameFromResourceId(resourceId);
    chai.assert.exists(this.functionAppName);

    console.log("Successfully init validator for function.");
  }

  public static async validateScaffold(
    projectPath: string,
    programmingLanguage: string
  ): Promise<void> {
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
    const tokenCredential = await tokenProvider.getIdentityCredentialAsync();
    const token = (await tokenCredential?.getToken(AzureScopes))?.token;

    const activeResourcePlugins = isV3Enabled()
      ? []
      : await getActivePluginsFromProjectSetting(this.projectPath);
    chai.assert.isArray(activeResourcePlugins);
    // Validating app settings
    console.log("validating app settings.");
    const webappSettingsResponse = await getWebappSettings(
      this.subscriptionId,
      this.rg,
      this.functionAppName,
      token as string
    );
    chai.assert.exists(webappSettingsResponse);
    chai.assert.equal(
      webappSettingsResponse[BaseConfig.API_ENDPOINT],
      this.ctx[PluginId.Function][StateConfigKey.functionEndpoint] as string
    );
    chai.assert.equal(
      webappSettingsResponse[BaseConfig.M365_APPLICATION_ID_URI],
      getExpectedM365ApplicationIdUri(this.ctx, activeResourcePlugins)
    );
    chai.assert.equal(
      webappSettingsResponse[BaseConfig.M365_CLIENT_SECRET],
      await getExpectedM365ClientSecret(this.ctx, this.projectPath, this.env, activeResourcePlugins)
    );
    chai.assert.equal(
      webappSettingsResponse[BaseConfig.IDENTITY_ID],
      this.ctx[PluginId.Identity][StateConfigKey.identityClientId] as string
    );

    if (activeResourcePlugins.includes(PluginId.AzureSQL)) {
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
    if (activeResourcePlugins.includes(PluginId.FrontendHosting)) {
      console.log("validating app config.");
      const webAppConfigResponse = await getWebappConfigs(
        this.subscriptionId,
        this.rg,
        this.functionAppName,
        token as string
      );
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
    const tokenCredential = await MockAzureAccountProvider.getIdentityCredentialAsync();
    const token = (await tokenCredential?.getToken(AzureScopes))?.token;

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
}

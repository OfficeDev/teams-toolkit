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
  getWebappConfigs,
  getWebappServicePlan,
  runWithRetry,
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
}

enum SQLConfig {
  IDENTITY_ID = "IDENTITY_ID",
  SQL_DATABASE_NAME = "SQL_DATABASE_NAME",
  SQL_ENDPOINT = "SQL_ENDPOINT",
}

interface IFunctionObject {
  functionAppName: string;
  appServicePlanName?: string;
  expectValues: Map<string, string>;
}

export class FunctionValidator {
  private static subscriptionId: string;
  private static rg: string;

  public static init(
    ctx: any,
    activeResourcePlugins: string[],
    resourceBaseName: string,
    insiderPreview = false
  ): IFunctionObject {
    console.log("Start to init validator for Function.");

    let functionObject: IFunctionObject;

    if (insiderPreview) {
      const resourceId = ctx[PluginId.Function][StateConfigKey.functionAppResourceId];
      this.subscriptionId = getSubscriptionIdFromResourceId(resourceId);
      this.rg = getResourceGroupNameFromResourceId(resourceId);

      const functionAppName = getSiteNameFromResourceId(resourceId);
      const expectValues = new Map<string, string>([]);
      expectValues.set(
        BaseConfig.API_ENDPOINT,
        ctx[PluginId.Function][StateConfigKey.functionEndpoint] as string
      );
      expectValues.set(
        BaseConfig.M365_APPLICATION_ID_URI,
        FunctionValidator.getExpectedM365ApplicationIdUri(ctx, activeResourcePlugins)
      );
      expectValues.set(
        BaseConfig.M365_CLIENT_SECRET,
        FunctionValidator.getM365ClientSecret(ctx, activeResourcePlugins, resourceBaseName)
      );
      expectValues.set(
        SQLConfig.SQL_ENDPOINT,
        ctx[PluginId.AzureSQL]?.[StateConfigKey.sqlEndpoint] as string
      );

      functionObject = {
        functionAppName: functionAppName,
        expectValues: expectValues,
      };
    } else {
      functionObject = ctx[PluginId.Function] as IFunctionObject;
      chai.assert.exists(functionObject);

      this.subscriptionId = ctx[PluginId.Solution][StateConfigKey.subscriptionId];
      chai.assert.exists(this.subscriptionId);

      this.rg = ctx[PluginId.Solution][StateConfigKey.resourceGroupName];
      chai.assert.exists(this.rg);

      const expectValues = new Map<string, string>([]);
      expectValues.set(
        BaseConfig.API_ENDPOINT,
        ctx[PluginId.Function][StateConfigKey.functionEndpoint] as string
      );
      expectValues.set(
        SQLConfig.SQL_ENDPOINT,
        ctx[PluginId.AzureSQL]?.[StateConfigKey.sqlEndpoint] as string
      );
      functionObject.expectValues = expectValues;
    }

    console.log("Successfully init validator for Function.");
    return functionObject;
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

  public static async validateProvision(
    functionObject: IFunctionObject,
    sqlEnabled = true,
    isMultiEnvEnabled = false
  ): Promise<void> {
    console.log("Start to validate Function Provision.");

    const tokenProvider = MockAzureAccountProvider;
    const tokenCredential = await tokenProvider.getAccountCredentialAsync();
    const token = (await tokenCredential?.getToken())?.accessToken;

    console.log("Validating app settings.");

    const appName = functionObject.functionAppName;
    const response = await getWebappConfigs(this.subscriptionId, this.rg, appName, token as string);

    // TODO: validate app config with allowedOrigins
    chai.assert.exists(response);

    Object.values(BaseConfig).forEach((v: string) => {
      chai.assert.exists(response[v]);
      if (functionObject.expectValues.get(v)) {
        chai.assert.equal(functionObject.expectValues.get(v), response[v]);
      }
    });

    if (sqlEnabled) {
      Object.values(SQLConfig).forEach((v: string) => {
        chai.assert.exists(response[v]);
        if (functionObject.expectValues.get(v)) {
          chai.assert.equal(functionObject.expectValues.get(v), response[v]);
        }
      });
    }

    if (!isMultiEnvEnabled) {
      console.log("Validating app service plan.");
      const servicePlanResponse = await getWebappServicePlan(
        this.subscriptionId,
        this.rg,
        functionObject.appServicePlanName!,
        token as string
      );
      chai.assert(servicePlanResponse, functionObject.appServicePlanName);
    }

    console.log("Successfully validate Function Provision.");
  }

  public static async validateDeploy(functionObject: IFunctionObject): Promise<void> {
    console.log("Start to validate Function Deployment.");

    // Disable validate deployment since we have too many requests and the test is not stable.
    const tokenCredential = await MockAzureAccountProvider.getAccountCredentialAsync();
    const token = (await tokenCredential?.getToken())?.accessToken;

    const appName = functionObject.functionAppName;

    const deployments = await this.getDeployments(
      this.subscriptionId,
      this.rg,
      appName,
      token as string
    );
    const deploymentId = deployments?.[0]?.properties?.id;
    const deploymentLog = await this.getDeploymentLog(
      this.subscriptionId,
      this.rg,
      appName,
      token as string,
      deploymentId!
    );

    chai.assert.exists(
      deploymentLog?.find((item: any) => item.properties.message === "Deployment successful.")
    );

    console.log("Successfully validate Function Deployment.");
  }

  private static async getDeployments(
    subscriptionId: string,
    rg: string,
    name: string,
    token: string
  ) {
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

  private static async getDeploymentLog(
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

  private static getExpectedM365ApplicationIdUri(
    ctx: any,
    activeResourcePlugins: string[]
  ): string {
    let expectedM365ApplicationIdUri: string;
    let botId: string;
    if (activeResourcePlugins.includes(PluginId.Bot)) {
      botId = ctx[PluginId.Bot][StateConfigKey.botId];
    }

    if (activeResourcePlugins.includes(PluginId.FrontendHosting)) {
      const tabDomain = ctx[PluginId.Aad][StateConfigKey.domain];
      const m365ClientId = ctx[PluginId.Aad][StateConfigKey.clientId];
      if (activeResourcePlugins.includes(PluginId.Bot)) {
        expectedM365ApplicationIdUri = `api://${tabDomain}/botid-${botId}`;
      } else {
        expectedM365ApplicationIdUri = `api://${tabDomain}/${m365ClientId}`;
      }
    } else if (activeResourcePlugins.includes(PluginId.Bot)) {
      expectedM365ApplicationIdUri = `api://botid-${botId}`;
    }
    return expectedM365ApplicationIdUri;
  }

  private static getM365ClientSecret(
    ctx: any,
    activeResourcePlugins: string[],
    resourceBaseName: string
  ): string {
    if (activeResourcePlugins.includes(PluginId.KeyVault)) {
      return `@Microsoft.KeyVault(VaultName=${resourceBaseName};SecretName=m365ClientSecret`;
    } else {
      return ctx[PluginId.Aad][StateConfigKey.clientSecret];
    }
  }
}

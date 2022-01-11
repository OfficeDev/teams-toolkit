// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import MockAzureAccountProvider from "../../src/commonlib/azureLoginUserPassword";
import {
  getActivePluginsFromProjectSetting,
  getKeyVaultSecretReference,
  getProvisionParameterValueByKey,
} from "../e2e/commonUtils";
import { StateConfigKey, PluginId, provisionParametersKey } from "./constants";
import {
  getResourceGroupNameFromResourceId,
  getSubscriptionIdFromResourceId,
  getWebappSettings,
  getWebappServicePlan,
  getKeyVaultNameFromResourceId,
} from "./utilities";

export class PropertiesKeys {
  static clientId = "CLIENT_ID";
  static clientSecret = "CLIENT_SECRET";
  static oauthAuthority = "OAUTH_AUTHORITY";
  static identifierUri = "IDENTIFIER_URI";
  static aadMetadataAddreass = "AAD_METADATA_ADDRESS";
}

export interface ISimpleAuthObject {
  endpoint: string;
  webAppResourceId?: string;
}

export class SimpleAuthValidator {
  private ctx: any;
  private projectPath: string;
  private env: string;

  private subscriptionId: string;
  private rg: string;
  private simpleAuthObject: ISimpleAuthObject;

  constructor(ctx: any, projectPath: string, env: string) {
    console.log("Start to init validator for Simple Auth.");

    this.ctx = ctx;
    this.projectPath = projectPath;
    this.env = env;

    const resourceId = ctx[PluginId.SimpleAuth][StateConfigKey.webAppResourceId];
    chai.assert.exists(resourceId);
    this.subscriptionId = getSubscriptionIdFromResourceId(resourceId);
    chai.assert.exists(this.subscriptionId);
    this.rg = getResourceGroupNameFromResourceId(resourceId);
    chai.assert.exists(this.rg);
    this.simpleAuthObject = {
      endpoint: ctx[PluginId.SimpleAuth][StateConfigKey.endpoint],
      webAppResourceId: ctx[PluginId.SimpleAuth][StateConfigKey.webAppResourceId],
    };

    console.log("Successfully init validator for Simple Auth.");
  }

  public async validate() {
    console.log("Start to validate Simple Auth.");

    const resourceName: string = this.simpleAuthObject.endpoint.slice(8, -18);
    chai.assert.exists(resourceName);

    const tokenProvider = MockAzureAccountProvider;
    const tokenCredential = await tokenProvider.getAccountCredentialAsync();
    const token = (await tokenCredential?.getToken())?.accessToken;

    console.log("Validating app settings.");
    const activeResourcePlugins = await getActivePluginsFromProjectSetting(this.projectPath);
    chai.assert.isArray(activeResourcePlugins);
    const response = await getWebappSettings(
      this.subscriptionId,
      this.rg,
      resourceName,
      token as string
    );
    chai.assert.exists(response);
    console.log(`[dilin-debug] response: ${JSON.stringify(response)}`);
    console.log(`[dilin-debug] ctx: ${JSON.stringify(this.ctx)}`);
    chai.assert.equal(
      response[PropertiesKeys.clientId],
      this.ctx[PluginId.Aad][StateConfigKey.clientId]
    );
    chai.assert.equal(
      response[PropertiesKeys.clientSecret],
      await this.getM365ClientSecret(activeResourcePlugins)
    );
    chai.assert.equal(
      response[PropertiesKeys.identifierUri],
      this.getExpectedM365ApplicationIdUri(this.ctx, activeResourcePlugins)
    );
    chai.assert.equal(
      response[PropertiesKeys.oauthAuthority],
      this.ctx[PluginId.Aad][StateConfigKey.oauthAuthority]
    );
    chai.assert.equal(
      response[PropertiesKeys.aadMetadataAddreass],
      `${
        this.ctx[PluginId.Aad][StateConfigKey.oauthAuthority]
      }/v2.0/.well-known/openid-configuration`
    );

    console.log("Validating app service plan.");
    const servicePlanName = resourceName.replace("-webapp", "-serverfarms");
    const serivcePlanResponse = await getWebappServicePlan(
      this.subscriptionId,
      this.rg,
      servicePlanName,
      token as string
    );
    const expectedServicePlan =
      (await getProvisionParameterValueByKey(
        this.projectPath,
        this.env,
        provisionParametersKey.simpleAuthSku
      )) ?? "F1";
    console.log("[dilin-debug] expectedServicePlan: " + expectedServicePlan);
    chai.assert(serivcePlanResponse, expectedServicePlan);

    console.log("Successfully validate Simple Auth.");
  }

  private getExpectedM365ApplicationIdUri(ctx: any, activeResourcePlugins: string[]): string {
    let expectedM365ApplicationIdUri = "";
    if (activeResourcePlugins.includes(PluginId.FrontendHosting)) {
      const tabDomain = ctx[PluginId.FrontendHosting][StateConfigKey.domain];
      const m365ClientId = ctx[PluginId.Aad][StateConfigKey.clientId];
      expectedM365ApplicationIdUri =
        `api://${tabDomain}/` +
        (activeResourcePlugins.includes(PluginId.Bot)
          ? `botid-${ctx[PluginId.Bot][StateConfigKey.botId]}`
          : `${m365ClientId}`);
    } else if (activeResourcePlugins.includes(PluginId.Bot)) {
      expectedM365ApplicationIdUri = `api://botid-${ctx[PluginId.Bot][StateConfigKey.botId]}`;
    }
    console.log(
      `[dilin-debug] Successfully get expectedM365ApplicationIdUri:  ${expectedM365ApplicationIdUri}`
    );

    return expectedM365ApplicationIdUri;
  }

  private async getM365ClientSecret(activeResourcePlugins: string[]): Promise<string> {
    let m365ClientSecret: string;
    if (activeResourcePlugins.includes(PluginId.KeyVault)) {
      const vaultName = getKeyVaultNameFromResourceId(
        this.ctx[PluginId.KeyVault][StateConfigKey.keyVaultResourceId]
      );
      const secretName =
        (await getProvisionParameterValueByKey(
          this.projectPath,
          this.env,
          provisionParametersKey.m365ClientSecretName
        )) ?? "m365ClientSecret";
      m365ClientSecret = getKeyVaultSecretReference(vaultName, secretName);
    } else {
      m365ClientSecret = this.ctx[PluginId.Aad][StateConfigKey.clientSecret];
    }
    console.log(`[dilin-debug] Successfully get m365ClientSecret:  ${m365ClientSecret}`);

    return m365ClientSecret;
  }
}

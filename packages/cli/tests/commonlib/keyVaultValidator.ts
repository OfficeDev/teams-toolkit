// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import * as chai from "chai";
import MockAzureAccountProvider from "../../src/commonlib/azureLoginUserPassword";
import {
  getActivePluginsFromProjectSetting,
  getAzureAccountObjectId,
  getAzureTenantId,
  getProvisionParameterValueByKey,
} from "../e2e/commonUtils";
import { PluginId, provisionParametersKey, StateConfigKey } from "./constants";
import {
  getKeyVaultNameFromResourceId,
  getResourceGroupNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "./utilities";

const keyvaultScope = "https://vault.azure.net/.default";
const baseUrlVaultSecrets = (vaultBaseUrl: string, secretName: string, secretVersion: string) =>
  `${vaultBaseUrl}/secrets/${secretName}/${secretVersion}?api-version=7.2`;
const baseUrlVaults = (subscriptionId: string, rg: string, vaultName: string) =>
  `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.KeyVault/vaults/${vaultName}?api-version=2019-09-01`;
const baseUrlVaultAddAccessPolicy = (subscriptionId: string, rg: string, vaultName: string) =>
  `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.KeyVault/vaults/${vaultName}/accessPolicies/add?api-version=2019-09-01`;

export interface IKeyVaultObject {
  name: string;
  vaultUri: string;
}

export class KeyVaultValidator {
  private projectPath: string;
  private env: string;

  private subscriptionId: string;
  private rg: string;
  private keyVault: IKeyVaultObject;

  constructor(ctx: any, projectPath: string, env: string) {
    console.log("Start to init validator for Key Vault.");

    this.projectPath = projectPath;
    this.env = env;

    const resourceId = ctx[PluginId.KeyVault][StateConfigKey.keyVaultResourceId];
    chai.assert.exists(resourceId);
    this.subscriptionId = getSubscriptionIdFromResourceId(resourceId);
    chai.assert.exists(this.subscriptionId);
    this.rg = getResourceGroupNameFromResourceId(resourceId);
    chai.assert.exists(this.rg);

    const keyVaultName = getKeyVaultNameFromResourceId(resourceId);
    chai.assert.exists(keyVaultName);
    this.keyVault = {
      name: keyVaultName,
      vaultUri: `https://${keyVaultName}.vault.azure.net`,
    };
    console.log("Successfully init validator for Key Vault.");
  }

  public async validate() {
    console.log("Start to validate Key Vault.");

    const tokenProvider = MockAzureAccountProvider;
    const tokenCredential = await tokenProvider.getAccountCredentialAsync();
    const token = (await tokenCredential?.getToken())?.accessToken;

    console.log("Validating key vault instance.");
    const keyVaultResponse = await this.getKeyVault(
      this.subscriptionId,
      this.rg,
      this.keyVault.name,
      token as string
    );
    chai.assert.exists(keyVaultResponse);

    // Update permission
    await this.updateKeyVaultPermission(
      this.subscriptionId,
      this.rg,
      this.keyVault.name,
      token as string,
      getAzureTenantId(),
      getAzureAccountObjectId()
    );

    console.log("Validating key vault secrets.");
    const identityTokenCredential = await tokenProvider.getIdentityCredentialAsync();
    const tokenToGetSecret = (await identityTokenCredential?.getToken(keyvaultScope))?.token;

    const m365ClientSecretName =
      (await getProvisionParameterValueByKey(
        this.projectPath,
        this.env,
        provisionParametersKey.m365ClientSecretName
      )) ?? "m365ClientSecret";
    const keyVaultSecretResponse = await this.getKeyVaultSecrets(
      this.keyVault.vaultUri,
      m365ClientSecretName,
      tokenToGetSecret as string
    );
    chai.assert.exists(keyVaultSecretResponse);

    const activeResourcePlugins = await getActivePluginsFromProjectSetting(this.projectPath);
    chai.assert.isArray(activeResourcePlugins);
    if (activeResourcePlugins.includes(PluginId.Bot)) {
      const botClientSecretName =
        (await getProvisionParameterValueByKey(
          this.projectPath,
          this.env,
          provisionParametersKey.botClientSecretName
        )) ?? "botClientSecret";
      const keyVaultSecretResponse = await this.getKeyVaultSecrets(
        this.keyVault.vaultUri,
        botClientSecretName,
        tokenToGetSecret as string
      );
      chai.assert.exists(keyVaultSecretResponse);
    }
    console.log("Successfully validate Key Vault.");
  }

  private async getKeyVaultSecrets(
    vaultUri: string,
    secretName: string,
    token: string,
    secretVersion = ""
  ) {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const getResponse = await axios.get(baseUrlVaultSecrets(vaultUri, secretName, secretVersion));

      if (getResponse && getResponse.data && getResponse.data.value) {
        return getResponse.data.value;
      }
    } catch (error) {
      console.log(error);
    }

    return undefined;
  }

  private async updateKeyVaultPermission(
    subscriptionId: string,
    rg: string,
    keyVaultName: string,
    token: string,
    tenantId: string,
    objectId: string
  ) {
    console.log(
      `Add key vault "get secret" permission for ${objectId} on key vault ${keyVaultName}, subscription id: ${subscriptionId}.`
    );

    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const body = {
        properties: {
          accessPolicies: [
            {
              tenantId: `${tenantId}`,
              objectId: `${objectId}`,
              permissions: {
                secrets: ["get"],
              },
            },
          ],
        },
      };
      const getResponse = await axios.put(
        baseUrlVaultAddAccessPolicy(subscriptionId, rg, keyVaultName),
        body
      );
      chai.assert.equal(getResponse.status, 200);
    } catch (error) {
      console.log(error);
    }

    console.log("Successfully Update key vault permission");
  }

  private async getKeyVault(
    subscriptionId: string,
    rg: string,
    keyVaultName: string,
    token: string
  ) {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const getResponse = await axios.get(baseUrlVaults(subscriptionId, rg, keyVaultName));
      if (getResponse && getResponse.data && getResponse.data.properties) {
        return getResponse.data.properties;
      }
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }
}

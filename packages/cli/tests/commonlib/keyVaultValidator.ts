// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import * as chai from "chai";
import MockAzureAccountProvider from "../../src/commonlib/azureLoginUserPassword";
import { getSiteNameFromResourceId } from "./utilities";

const keyVaultPluginName = "fx-resource-key-vault";
const functionPluginName = "fx-resource-function";
const functionAppResourceIdKeyName = "functionAppResourceId";
const m365ClientSecretReferenceKeyName = "m365ClientSecretReference";
const solutionPluginName = "solution";
const subscriptionKey = "subscriptionId";
const rgKey = "resourceGroupName";
const baseUrlConfigReferenceAppSettings = (subscriptionId: string, rg: string, name: string) =>
  `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}/config/configreferences/appsettings?api-version=2021-02-01`;


export interface IKeyVaultObject {
  m365ClientSecretReference: string;
  functionAppName: string;
}

export class KeyVaultValidator {
  private static subscriptionId: string;
  private static rg: string;

  public static init(ctx: any): IKeyVaultObject {
    console.log("Start to init validator for Key Vault.");

    const resourceId = ctx[functionPluginName][functionAppResourceIdKeyName];

    const keyVaultObject = {
      m365ClientSecretReference: ctx[keyVaultPluginName][m365ClientSecretReferenceKeyName],
      functionAppName: getSiteNameFromResourceId(resourceId),
    } as IKeyVaultObject;
    chai.assert.exists(keyVaultObject);

    this.subscriptionId = ctx[solutionPluginName][subscriptionKey];
    chai.assert.exists(this.subscriptionId);

    this.rg = ctx[solutionPluginName][rgKey];
    chai.assert.exists(this.rg);

    console.log("Successfully init validator for Key Vault.");
    return keyVaultObject;
  }

  public static async validate(keyVaultObject: IKeyVaultObject) {
    console.log("Start to validate Key Vault.");

    const tokenProvider = MockAzureAccountProvider;
    const tokenCredential = await tokenProvider.getAccountCredentialAsync();
    const token = (await tokenCredential?.getToken())?.accessToken;

    console.log("Validating app settings.");

    const response = await this.getWebappConfigReferenceAppSettings(
      this.subscriptionId,
      this.rg,
      keyVaultObject.functionAppName,
      token as string
    );

    console.log(response);

    // Validate Key Vault reference in Azure Fucntion
    chai.assert.exists(response);
    chai.assert.equal(response.length, 1);
    chai.assert.equal(response[0].name, "M365_CLIENT_SECRET");
    chai.assert.equal(response[0].properties.secretName, "m365ClientSecret");
    chai.assert.equal(response[0].properties.reference, keyVaultObject.m365ClientSecretReference);
    chai.assert.equal(response[0].properties.status, "Resolved");

    console.log("Successfully validate Key Vault.");
  }

  private static async getWebappConfigReferenceAppSettings(
    subscriptionId: string,
    rg: string,
    name: string,
    token: string
  ) {
    try {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const response = await axios.get(baseUrlConfigReferenceAppSettings(subscriptionId, rg, name));

      if (!response || !response.data || !response.data.value) {
        return undefined;
      }
      return response.data.value;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { isArmSupportEnabled } from "@microsoft/teamsfx-core";
import * as chai from "chai";
import MockAzureAccountProvider from "../../src/commonlib/azureLoginUserPassword";
import { IAadObject } from "./interfaces/IAADDefinition";
import {
  getResourceGroupNameFromResourceId,
  getSubscriptionIdFromResourceId,
  getWebappConfigs,
  getWebappServicePlan,
} from "./utilities";

const simpleAuthPluginName = "fx-resource-simple-auth";
const solutionPluginName = "solution";
const subscriptionKey = "subscriptionId";
const rgKey = "resourceGroupName";

export class PropertiesKeys {
  static clientId = "CLIENT_ID";
  static clientSecret = "CLIENT_SECRET";
  static oauthAuthority = "OAUTH_AUTHORITY";
  static identifierUri = "IDENTIFIER_URI";
  static aadMetadataAddreass = "AAD_METADATA_ADDRESS";
}

export interface ISimpleAuthObject {
  endpoint: string;
  storageResourceId?: string;
}

export class SimpleAuthValidator {
  private static subscriptionId: string;
  private static rg: string;

  public static init(ctx: any, isLocalDebug = false): ISimpleAuthObject {
    console.log("Start to init validator for Simple Auth.");

    let simpleAuthObject: ISimpleAuthObject;
    if (!isLocalDebug) {
      simpleAuthObject = <ISimpleAuthObject>ctx[simpleAuthPluginName];
    } else {
      simpleAuthObject = {
        endpoint: ctx[simpleAuthPluginName]["endpoint"],
        storageResourceId: ctx[simpleAuthPluginName]["storageResourceId"],
      } as ISimpleAuthObject;
    }
    chai.assert.exists(simpleAuthObject);

    if (isArmSupportEnabled()) {
      this.subscriptionId = getSubscriptionIdFromResourceId(simpleAuthObject.storageResourceId);
      this.rg = getResourceGroupNameFromResourceId(simpleAuthObject.storageResourceId);
    } else {
      this.subscriptionId = ctx[solutionPluginName][subscriptionKey];
      this.rg = ctx[solutionPluginName][rgKey];
    }

    chai.assert.exists(this.subscriptionId);
    chai.assert.exists(this.rg);

    console.log("Successfully init validator for Simple Auth.");
    return simpleAuthObject;
  }

  public static async validate(
    simpleAuthObject: ISimpleAuthObject,
    aadObject: IAadObject,
    servicePlan = "B1",
    isMultiEnvEnabled = false
  ) {
    console.log("Start to validate Simple Auth.");

    const resourceName: string = simpleAuthObject.endpoint.slice(8, -18);
    chai.assert.exists(resourceName);

    const tokenProvider = MockAzureAccountProvider;
    const tokenCredential = await tokenProvider.getAccountCredentialAsync();
    const token = (await tokenCredential?.getToken())?.accessToken;

    console.log("Validating app settings.");
    const response = await getWebappConfigs(
      this.subscriptionId,
      this.rg,
      resourceName,
      token as string
    );
    chai.assert.exists(response);
    chai.assert.equal(aadObject.clientId, response[PropertiesKeys.clientId]);
    // chai.assert.equal(aadObject.clientSecret, response[PropertiesKeys.clientSecret]);
    chai.assert.equal(aadObject.applicationIdUris, response[PropertiesKeys.identifierUri]);
    chai.assert.equal(aadObject.oauthAuthority, response[PropertiesKeys.oauthAuthority]);
    chai.assert.equal(
      `${aadObject.oauthAuthority}/v2.0/.well-known/openid-configuration`,
      response[PropertiesKeys.aadMetadataAddreass]
    );

    console.log("Validating app service plan.");
    const servicePlanName = isMultiEnvEnabled
      ? resourceName.replace("-webapp", "-serverfarms")
      : resourceName;
    const serivcePlanResponse = await getWebappServicePlan(
      this.subscriptionId,
      this.rg,
      servicePlanName,
      token as string
    );
    chai.assert(serivcePlanResponse, servicePlan);

    console.log("Successfully validate Simple Auth.");
  }
}

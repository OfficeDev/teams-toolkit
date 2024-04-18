// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureScopes } from "@microsoft/teamsfx-core/build/common/tools";
import * as chai from "chai";

import MockAzureAccountProvider from "@microsoft/teamsapp-cli/src/commonlib/azureLoginUserPassword";
import { EnvConstants } from "./constants";

import {
  getContainerAppProperties,
  getSubscriptionIdFromResourceId,
  getResourceGroupNameFromResourceId,
} from "./utilities";
import { Executor } from "../utils/executor";
import { Env } from "../utils/env";

export class ContainerAppValidator {
  private ctx: any;
  private subscriptionId: string;
  private rg: string;
  private containerAppName: string;

  constructor(ctx: any) {
    console.log("Start to init validator for Azure Container App.");

    this.ctx = ctx;

    const resourceId = ctx[EnvConstants.AZURE_CONTAINER_APP_RESOURCE_ID];
    chai.assert.exists(resourceId);
    this.subscriptionId = getSubscriptionIdFromResourceId(resourceId);
    chai.assert.exists(this.subscriptionId);
    this.rg = getResourceGroupNameFromResourceId(resourceId);
    chai.assert.exists(this.rg);
    this.containerAppName = this.ctx[EnvConstants.AZURE_CONTAINER_APP_NAME];
    chai.assert.exists(this.containerAppName);
    process.env[EnvConstants.AZURE_CONTAINER_APP_NAME] = this.containerAppName;

    console.log("Successfully init validator for Azure Container App.");
  }

  public async validateProvision(includeAAD = true): Promise<void> {
    console.log("Start to validate Azure Container App Provision.");

    const tokenProvider = MockAzureAccountProvider;
    const tokenCredential = await tokenProvider.getIdentityCredentialAsync();
    const token = (await tokenCredential?.getToken(AzureScopes))?.token;

    const response = await getContainerAppProperties(
      this.subscriptionId,
      this.rg,
      this.containerAppName,
      token as string
    );
    chai.assert.exists(response);
    console.log("Successfully validate Azure Container App Provision.");
  }

  static async validateContainerAppStatus(): Promise<void> {
    const command = `az containerapp show --name ${
      process.env[EnvConstants.AZURE_CONTAINER_APP_NAME]
    } --resource-group ${Env["azureResourceGroup"]} --subscription ${
      Env["azureSubscriptionId"]
    }`;

    const { stdout, success } = await Executor.execute(command, process.cwd());
    chai.assert.isTrue(success);
    const result = JSON.parse(stdout);
    const status = result.properties?.runningStatus;
    chai.assert.strictEqual(status, "Running", "Status should be 'Running'");
  }
}

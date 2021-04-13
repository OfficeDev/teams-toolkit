// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as arm from "azure-arm-resource";
import * as msRestAzure from "ms-rest-azure";

import * as azureConfig from "../conf/azure.json";

require("dotenv").config();

const user = process.env.TEST_USER_NAME ?? "";
const password = process.env.TEST_USER_PASSWORD ?? "";

export class MockAzureResourceManager {
  private static instance: MockAzureResourceManager;

  private client?: arm.ResourceManagementClient;

  private constructor() {}

  public static getInstance(): MockAzureResourceManager {
    if (!MockAzureResourceManager.instance) {
      MockAzureResourceManager.instance = new MockAzureResourceManager();
    }

    return MockAzureResourceManager.instance;
  }

  public async restore(rg: string): Promise<void> {
    if (!this.client) {
      await this.init();
    }
    this.client!.resourceGroups.deleteMethod(rg, function (
      err,
      result,
      request,
      response
    ) {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
      }
    });
  }

  private async init() {
    let c = await msRestAzure.loginWithUsernamePassword(user, password);
    this.client = new arm.ResourceManagementClient(
      c,
      azureConfig.subscription.id
    );
  }
}

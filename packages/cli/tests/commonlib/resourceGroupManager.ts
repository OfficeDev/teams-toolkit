// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as arm from "azure-arm-resource";
import * as msRestAzure from "ms-rest-azure";

import * as azureConfig from "../../src/commonlib/common/userPasswordConfig";

const user = azureConfig.AZURE_ACCOUNT_NAME || "";
const password = azureConfig.AZURE_ACCOUNT_PASSWORD || "";
const subscriptionId = azureConfig.AZURE_SUBSCRIPTION_ID || "";

function delay(ms: number) {
  // tslint:disable-next-line no-string-based-set-timeout
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ResourceGroupManager {
  private static instance: ResourceGroupManager;

  private static client?: arm.ResourceManagementClient;

  private constructor() {
    ResourceGroupManager.client = undefined;
  }

  public static async init(): Promise<ResourceGroupManager> {
    if (!ResourceGroupManager.instance) {
      ResourceGroupManager.instance = new ResourceGroupManager();
      const c = await msRestAzure.loginWithUsernamePassword(user, password, {
        domain: azureConfig.AZURE_TENANT_ID,
      });
      ResourceGroupManager.client = new arm.ResourceManagementClient(c, subscriptionId);
    }
    return Promise.resolve(ResourceGroupManager.instance);
  }

  public async getResourceGroup(name: string) {
    return ResourceGroupManager.client!.resourceGroups.get(name);
  }

  public async hasResourceGroup(name: string) {
    try {
      await this.getResourceGroup(name);
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  public async searchResourceGroups(contain: string) {
    const groups = await ResourceGroupManager.client!.resourceGroups.list();
    return groups.filter((group) => group.name?.includes(contain));
  }

  public async deleteResourceGroup(name: string, retryTimes = 5): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      for (let i = 0; i < retryTimes; ++i) {
        try {
          await ResourceGroupManager.client!.resourceGroups.deleteMethod(name);
          return resolve(true);
        } catch (e) {
          await delay(2000);
          if (i < retryTimes - 1) {
            console.warn(`[Retry] clean up the Azure resoure group failed with name: ${name}`);
          }
        }
      }
      return resolve(false);
    });
  }
}

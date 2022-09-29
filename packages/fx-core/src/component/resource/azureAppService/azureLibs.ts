// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { WebSiteManagementClient } from "@azure/arm-appservice";
import { TokenCredential } from "@azure/identity";

export class AzureClientFactory {
  static getWebSiteManagementClient(
    credentials: TokenCredential,
    subscriptionId: string
  ): WebSiteManagementClient {
    return new WebSiteManagementClient(credentials, subscriptionId);
  }
}

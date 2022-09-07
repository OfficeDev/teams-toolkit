// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { WebSiteManagementClient } from "@azure/arm-appservice";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

export class AzureClientFactory {
  static getWebSiteManagementClient(
    credentials: TokenCredentialsBase,
    subscriptionId: string
  ): WebSiteManagementClient {
    return new WebSiteManagementClient(credentials, subscriptionId);
  }
}

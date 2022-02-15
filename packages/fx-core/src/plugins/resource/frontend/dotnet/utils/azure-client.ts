// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { WebSiteManagementClient } from "@azure/arm-appservice";

export class AzureClientFactory {
  public static getWebSiteManagementClient(
    credentials: TokenCredentialsBase,
    subscriptionId: string
  ): WebSiteManagementClient {
    return new WebSiteManagementClient(credentials, subscriptionId);
  }
}

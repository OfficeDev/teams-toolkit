// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ManagementConfig {
  sqlServer: string;
  sqlEndpoint: string;
  resourceGroup: string;
  azureSubscriptionId: string;
}

export interface SqlConfig {
  sqlEndpoint: string;
  identity: string;
  databases: string[];
}

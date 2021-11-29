// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Json } from "../types";

export interface CloudResource extends Json {
  type?: string;
  resourceId?: string; //resourceId
  resourceName?: string;
  endpoint?: string;
  skuName?: string;
  secretFields?: string[];
}

export interface AppResource extends Json {
  appId: string;
}

export interface ResourceStates {
  solution: Json;
  [key: string]: CloudResource | CloudResource[];
}

////////////Azure Solution/////////////////////
export interface AzureResource extends CloudResource {
  resourceGroupName?: string;
  subscriptionId?: string;
  tenantId?: string;
  location?: string;
}

export interface AzureSolutionConfig extends Json {
  resourceNameSuffix: string;
  resourceGroupName: string;
  tenantId: string;
  subscriptionId: string;
  subscriptionName: string;
  location: string;
  provisionSucceeded: boolean;
}

export interface TeamsAppResource extends AppResource {
  tenantId: string;
}

export interface TeamsFxAzureResourceStates extends ResourceStates {
  solution: AzureSolutionConfig;
  [key: string]: AzureResource | AzureResource[];
}

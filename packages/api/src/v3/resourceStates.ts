// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Json } from "../types";

export interface CloudResource extends Json {
  /**
   * resource id is unique identifier for the cloud resource
   */
  resourceId?: string;
  /**
   * resource name is the string name for the resource
   */
  resourceName?: string;
  /**
   * endpoint url for access
   */
  endpoint?: string | string[];
  /**
   * secret fields names, if a property is defined as secret, the value will be encrypted and replaced in .userdata file
   */
  secretFields?: string[];
}

export interface AppResource extends Json {
  /**
   * App identifier
   */
  appId: string;
}

/**
 * ResourceStates contains all provision outputs of all resource plugins
 */
export interface ResourceStates {
  /**
   * solution object contains common configs shared by all resources
   */
  solution: Json;

  /**
   * key is resource plugin name
   * value is cloud resource state object
   */
  [key: string]: CloudResource | CloudResource[];
}

////////////Azure Solution/////////////////////
export type AzureResource = CloudResource;

/**
 * Azure solution common config
 */
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
  /**
   * M365 tenant id
   */
  tenantId: string;
}

export interface TeamsFxAzureResourceStates extends ResourceStates {
  /**
   * Azure solution configs contains common configs shared by all resources
   */
  solution: AzureSolutionConfig;
  [key: string]: AzureResource | AzureResource[];
}

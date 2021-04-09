// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * configuration for current environment.
 * @beta
 */
export interface Configuration {
  /**
   * Authentication related configuration.
   *
   * @readonly
   */
  readonly authentication?: AuthenticationConfiguration;

  /**
   * Configuration for resources.
   *
   * @readonly
   */
  readonly resources?: ResourceConfiguration[];
}

/**
 * Authentication related configuration.
 * @beta
 */
export interface AuthenticationConfiguration {
  /**
   * Hostname of AAD authority. Default value comes from M365_AUTHORITY_HOST environment variable.
   *
   * @readonly
   */
  readonly authorityHost?: string;

  /**
   * AAD tenant id, default value comes from M365_TENANT_ID environment variable.
   *
   * @readonly
   */
  readonly tenantId?: string;

  /**
   * The client (application) ID of an App Registration in the tenant, default value comes from M365_CLIENT_ID environment variable
   *
   * @readonly
   */
  readonly clientId?: string;

  /**
   * Secret string that the application uses when requesting a token. Only used in confidential client applications. Can be created in the Azure app registration portal. Default value comes from M365_CLIENT_SECRET environment variable
   *
   * @readonly
   */
  readonly clientSecret?: string;

  /**
   * Endpoint of auth service provisioned by Teams App Framework toolkit. Default value comes from SIMPLE_AUTH_ENDPOINT environment variable.
   *
   * @readonly
   */
  readonly simpleAuthEndpoint?: string;

  /**
   * Login page for Teams to redirect to.  Default value comes from INITIATE_LOGIN_ENDPOINT environment variable.
   *
   * @readonly
   */
  readonly initiateLoginEndpoint?: string;

  /**
   * Application ID URI. Default value comes from M365_APPLICATION_ID_URI environment variable.
   */
  readonly applicationIdUri?: string;
}

/**
 * Configuration for resources.
 * @beta
 */
export interface ResourceConfiguration {
  /**
   * Resource type.
   *
   * @readonly
   */
  readonly type: ResourceType;

  /**
   * Resource name.
   *
   * @readonly
   */
  readonly name: string;

  /**
   * Config for the resource.
   *
   * @readonly
   */
  readonly properties: { [index: string]: any };
}

/**
 * Available resource type.
 * @beta
 */
export enum ResourceType {
  /**
   * SQL database.
   *
   */
  SQL,

  /**
   * Rest API.
   *
   */
  API
}

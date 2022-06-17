// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Authentication related configuration.
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
   * The content of a PEM-encoded public/private key certificate.
   *
   * @readonly
   */
  readonly certificateContent?: string;

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

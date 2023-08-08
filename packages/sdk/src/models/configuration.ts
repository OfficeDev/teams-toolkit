// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// eslint-disable-next-line no-secrets/no-secrets
/**
 * Authentication related configuration.
 * @deprecated Please use {@link TeamsUserCredentialAuthConfig}
 * or {@link OnBehalfOfCredentialAuthConfig} or {@link AppCredentialAuthConfig} instead.
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

/**
 * Authentication configuration for TeamsUserCredential used in browser environment
 */
export type TeamsUserCredentialAuthConfig = {
  /**
   * Login page for Teams to redirect to.
   */
  initiateLoginEndpoint: string;

  /**
   * The client (application) ID of an App Registration in the tenant
   */
  clientId: string;
};

/**
 * Authentication configuration for OnBehalfOfCredential used in node environment
 */
export type OnBehalfOfCredentialAuthConfig = {
  /**
   * Hostname of AAD authority.
   */
  authorityHost: string;

  /**
   * The client (application) ID of an App Registration in the tenant
   */
  clientId: string;

  /**
   * AAD tenant id
   *
   * @readonly
   */
  tenantId: string;
} & (
  | {
      /**
       * Secret string that the application uses when requesting a token. Only used in confidential client applications. Can be created in the Azure app registration portal.
       */
      clientSecret: string;
      certificateContent?: never;
    }
  | {
      clientSecret?: never;
      /**
       * The content of a PEM-encoded public/private key certificate.
       *
       * @readonly
       */
      certificateContent: string;
    }
);

/**
 * Authentication configuration for AppCredential used in node environment
 */
export type AppCredentialAuthConfig = OnBehalfOfCredentialAuthConfig;

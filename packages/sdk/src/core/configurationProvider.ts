// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ApiConfiguration,
  AuthenticationConfiguration,
  SqlConfiguration,
} from "../models/configuration";

/**
 * @returns Authentication configuration which is constructed from predefined env variables.
 *
 * @remarks
 * Used variables: M365_AUTHORITY_HOST, M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET,
 * SIMPLE_AUTH_ENDPOINT, INITIATE_LOGIN_ENDPOINT, M365_APPLICATION_ID_URI
 *
 * @beta
 */
export function getAuthenticationConfigFromEnv(): AuthenticationConfiguration {
  return {
    authorityHost: process.env.M365_AUTHORITY_HOST,
    tenantId: process.env.M365_TENANT_ID,
    clientId: process.env.M365_CLIENT_ID,
    clientSecret: process.env.M365_CLIENT_SECRET,
    simpleAuthEndpoint: process.env.SIMPLE_AUTH_ENDPOINT,
    initiateLoginEndpoint: process.env.INITIATE_LOGIN_ENDPOINT,
    applicationIdUri: process.env.M365_APPLICATION_ID_URI,
  };
}

/**
 * @returns API configuration which is constructed from predefined env variables.
 *
 * @remarks
 * Used variables: API_ENDPOINT
 *
 * @beta
 */
export function getApiConfigFromEnv(): ApiConfiguration {
  return {
    endpoint: process.env.API_ENDPOINT,
  };
}

/**
 * @returns SQL configuration which is constructed from predefined env variables.
 *
 * @remarks
 * Used variables: SQL_ENDPOINT, SQL_USER_NAME, SQL_PASSWORD, SQL_DATABASE_NAME, IDENTITY_ID
 *
 * @beta
 */
export function getSqlConfigFromEnv(): SqlConfiguration {
  return {
    sqlServerEndpoint: process.env.SQL_ENDPOINT || "",
    sqlUsername: process.env.SQL_USER_NAME,
    sqlPassword: process.env.SQL_PASSWORD,
    sqlDatabaseName: process.env.SQL_DATABASE_NAME,
    sqlIdentityId: process.env.IDENTITY_ID,
  };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ApiConfiguration,
  AuthenticationConfiguration,
  SqlConfiguration,
} from "../models/configuration";
import { internalLogger } from "../util/logger";
import { formatString, isNode } from "../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "./errors";

export function getAuthenticationConfigFromEnv(): AuthenticationConfiguration {
  // TODO: test and logging
  if (isNode) {
    return {
      authorityHost: process.env.M365_AUTHORITY_HOST,
      tenantId: process.env.M365_TENANT_ID,
      clientId: process.env.M365_CLIENT_ID,
      clientSecret: process.env.M365_CLIENT_SECRET,
      simpleAuthEndpoint: process.env.SIMPLE_AUTH_ENDPOINT,
      initiateLoginEndpoint: process.env.INITIATE_LOGIN_ENDPOINT,
      applicationIdUri: process.env.M365_APPLICATION_ID_URI,
    };
  } else {
    return {
      authorityHost: process.env.REACT_APP_AUTHORITY_HOST,
      tenantId: process.env.REACT_APP_TENANT_ID,
      clientId: process.env.REACT_APP_CLIENT_ID,
      simpleAuthEndpoint: process.env.REACT_APP_TEAMSFX_ENDPOINT,
      initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
      applicationIdUri: process.env.M365_APPLICATION_ID_URI,
    };
  }
}

export function getApiConfigFromEnv(): ApiConfiguration {
  if (isNode) {
    return {
      endpoint: process.env.API_ENDPOINT,
    };
  } else {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "getApiConfigFromEnv"),
      ErrorCode.RuntimeNotSupported
    );
  }
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
  if (isNode) {
    return {
      sqlServerEndpoint: process.env.SQL_ENDPOINT || "",
      sqlUsername: process.env.SQL_USER_NAME,
      sqlPassword: process.env.SQL_PASSWORD,
      sqlDatabaseName: process.env.SQL_DATABASE_NAME,
      sqlIdentityId: process.env.IDENTITY_ID,
    };
  } else {
    throw new ErrorWithCode(
      formatString(ErrorMessage.BrowserRuntimeNotSupported, "getApiConfigFromEnv"),
      ErrorCode.RuntimeNotSupported
    );
  }
}

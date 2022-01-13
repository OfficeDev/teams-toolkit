// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ApiConfiguration,
  AuthenticationConfiguration,
  SqlConfiguration,
} from "../models/configuration";
import { internalLogger } from "../util/logger";
import { formatString } from "../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "./errors";

/**
 * @returns Authentication configuration which is constructed from predefined env variables.
 *
 * @remarks
 * Used variables: REACT_APP_AUTHORITY_HOST, REACT_APP_TENANT_ID, REACT_APP_CLIENT_ID,
 * REACT_APP_TEAMSFX_ENDPOINT, REACT_APP_START_LOGIN_PAGE_URL, M365_APPLICATION_ID_URI
 *
 * @beta
 */
export function getAuthenticationConfigFromEnv(): AuthenticationConfiguration {
  if (process && process.env) {
    return {
      authorityHost: process.env.REACT_APP_AUTHORITY_HOST,
      tenantId: process.env.REACT_APP_TENANT_ID,
      clientId: process.env.REACT_APP_CLIENT_ID,
      simpleAuthEndpoint: process.env.REACT_APP_TEAMSFX_ENDPOINT,
      initiateLoginEndpoint: process.env.REACT_APP_START_LOGIN_PAGE_URL,
      applicationIdUri: process.env.M365_APPLICATION_ID_URI,
    };
  } else {
    const env = (window as any).__env__;
    return {
      authorityHost: env.REACT_APP_AUTHORITY_HOST,
      tenantId: env.REACT_APP_TENANT_ID,
      clientId: env.REACT_APP_CLIENT_ID,
      simpleAuthEndpoint: env.REACT_APP_TEAMSFX_ENDPOINT,
      initiateLoginEndpoint: env.REACT_APP_START_LOGIN_PAGE_URL,
      applicationIdUri: env.M365_APPLICATION_ID_URI,
    };
  }
}

/**
 * Configuration helper function
 * @returns API configuration which is constructed from predefined env variables.
 *
 * @remarks
 * Used variables: API_ENDPOINT
 *
 * @beta
 */
export function getApiConfigFromEnv(): ApiConfiguration {
  if (process && process.env) {
    return {
      endpoint: process.env.REACT_APP_FUNC_ENDPOINT,
    };
  } else {
    const env = (window as any).__env__;
    return {
      endpoint: env.REACT_APP_FUNC_ENDPOINT,
    };
  }
}

/**
 * Only works in NodeJS.
 */
export function getSqlConfigFromEnv(): SqlConfiguration {
  throw new ErrorWithCode(
    formatString(ErrorMessage.BrowserRuntimeNotSupported, "getSqlConfigFromEnv"),
    ErrorCode.RuntimeNotSupported
  );
}

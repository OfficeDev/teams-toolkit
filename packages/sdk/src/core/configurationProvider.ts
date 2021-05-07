// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { isNode } from "@azure/core-http";
import {
  AuthenticationConfiguration,
  Configuration,
  ResourceConfiguration,
  ResourceType
} from "../models/configuration";
import { internalLogger } from "../util/logger";
import { formatString } from "../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "./errors";

/**
 * Global configuration instance
 *
 */
export let config: Configuration;

/**
 * Initialize configuration from environment variables or configuration object and set the global instance
 * 
 * @param {Configuration} configuration - Optional configuration that overrides the default configuration values. The override depth is 1.
 * 
 * @throws {@link ErrorCode|InvalidParameter} when configuration is not passed in when in browser environment
 * 
 * @beta
 */
export function loadConfiguration(configuration?: Configuration): void {
  internalLogger.info("load configuration");

  // browser environment
  if (!isNode) {
    if (!configuration) {
      const errorMsg = "You are running the code in browser. Configuration must be passed in.";
      internalLogger.error(errorMsg);
      throw new ErrorWithCode(errorMsg, ErrorCode.InvalidParameter);
    }
    config = configuration;
    return;
  }

  // node environment
  let newAuthentication: AuthenticationConfiguration;
  let newResources: ResourceConfiguration[] = [];
  const defaultResourceName = "default";

  if (configuration?.authentication) {
    newAuthentication = configuration.authentication;
  } else {
    newAuthentication = {
      authorityHost: process.env.M365_AUTHORITY_HOST,
      tenantId: process.env.M365_TENANT_ID,
      clientId: process.env.M365_CLIENT_ID,
      clientSecret: process.env.M365_CLIENT_SECRET,
      simpleAuthEndpoint: process.env.SIMPLE_AUTH_ENDPOINT,
      initiateLoginEndpoint: process.env.INITIATE_LOGIN_ENDPOINT,
      applicationIdUri: process.env.M365_APPLICATION_ID_URI
    };
  }

  if (configuration?.resources) {
    newResources = configuration.resources;
  } else {
    newResources = [
      {
        // sql resource
        type: ResourceType.SQL,
        name: defaultResourceName,
        properties: {
          sqlServerEndpoint: process.env.SQL_ENDPOINT,
          sqlUsername: process.env.SQL_USER_NAME,
          sqlPassword: process.env.SQL_PASSWORD,
          sqlDatabaseName: process.env.SQL_DATABASE_NAME,
          sqlIdentityId: process.env.IDENTITY_ID
        }
      },
      {
        // API resource
        type: ResourceType.API,
        name: defaultResourceName,
        properties: {
          endpoint: process.env.API_ENDPOINT
        }
      }
    ];
  }

  config = {
    authentication: newAuthentication,
    resources: newResources
  };
}

/**
 * Get configuration for a specific resource.
 * @param {ResourceType} resourceType - The type of resource
 * @param {string} resourceName - The name of resource, default value is "default".
 *
 * @returns Resource configuration for target resource from global configuration instance.
 * 
 * @throws {@link ErrorCode|InvalidConfiguration} when resource configuration with the specific type and name is not found
 * 
 * @beta
 */
export function getResourceConfiguration(
  resourceType: ResourceType,
  resourceName = "default"
): { [index: string]: any } {
  internalLogger.info(
    `Get resource configuration of ${ResourceType[resourceType]} from ${resourceName}`
  );
  const result: ResourceConfiguration | undefined = config.resources?.find(
    (item) => item.type === resourceType && item.name === resourceName
  );
  if (result) {
    return result.properties;
  }

  const errorMsg = formatString(
    ErrorMessage.MissingResourceConfiguration,
    ResourceType[resourceType],
    resourceName
  );
  internalLogger.error(errorMsg);
  throw new ErrorWithCode(errorMsg, ErrorCode.InvalidConfiguration);
}

/**
 * Get configuration for authentication.
 * 
 * @returns Authentication configuration from global configuration instance, the value may be undefined if no authentication config exists in current environment.
 * 
 * @throws {@link ErrorCode|InvalidConfiguration} when global configuration does not exist
 * 
 * @beta
 */
export function getAuthenticationConfiguration(): AuthenticationConfiguration | undefined {
  internalLogger.info("Get authentication configuration");
  if (config) {
    return config.authentication;
  }
  const errorMsg =
    "Please call loadConfiguration() first before calling getAuthenticationConfiguration().";
  internalLogger.error(errorMsg);
  throw new ErrorWithCode(
    formatString(ErrorMessage.ConfigurationNotExists, errorMsg),
    ErrorCode.InvalidConfiguration
  );
}

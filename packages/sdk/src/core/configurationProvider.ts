// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { isNode } from "@azure/core-http";
import {
  AuthenticationConfiguration,
  Configuration,
  ResourceConfiguration,
  ResourceType
} from "../models/configuration";
import { formatString } from "../util/utils";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "./errors";

/**
 * Global configuration instance
 *
 */
export let config: Configuration;

/**
 * Initialize configuration from environment variables and set the global instance
 *
 * @beta
 *
 * @param {Configuration} configuration - Optional configuration that overrides the default configuration values. The override depth is 1.
 * @throws {InvalidParameter} if configuration is not passed in when in browser environment
 */
export function loadConfiguration(configuration?: Configuration): void {
  // browser environment
  if (!isNode) {
    if (!configuration) {
      throw new ErrorWithCode(
        "You are running the code in browser. Configuration must be passed in.",
        ErrorCode.InvalidParameter
      );
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
 * Gets configuration for a specific resource.
 *
 * @beta
 *
 * @param {ResourceType} resourceType - The type of resource
 * @param {string} resourceName - The name of resource, default value is "default".
 *
 * @returns ResourceConfiguration for target resource from global configuration instance.
 * @throws {InvalidConfiguration} if resource configuration with the specific type and name is not found
 */
export function getResourceConfiguration(
  resourceType: ResourceType,
  resourceName = "default"
): { [index: string]: any } {
  const result: ResourceConfiguration | undefined = config.resources?.find(
    (item) => item.type === resourceType && item.name === resourceName
  );
  if (result) {
    return result.properties;
  }
  throw new ErrorWithCode(
    formatString(ErrorMessage.MissingResourceConfiguration, resourceType.toString(), resourceName),
    ErrorCode.InvalidConfiguration
  );
}

/**
 * Gets configuration for authentication.
 *
 * @beta
 *
 * @returns AuthenticationConfiguration from global configuration instance, the value may be undefined if no authentication config exists in current environment.
 * @throws {InvalidConfiguration} if global configuration does not exist
 */
export function getAuthenticationConfiguration(): AuthenticationConfiguration | undefined {
  if (config) {
    return config.authentication;
  }
  throw new ErrorWithCode(
    formatString(
      ErrorMessage.ConfigurationNotExists,
      "Please call loadConfiguration() first before calling getAuthenticationConfiguration()."
    ),
    ErrorCode.InvalidConfiguration
  );
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, ManagedIdentityCredential } from "@azure/identity";
import { ConnectionConfig } from "tedious";
import { ErrorWithCode, ErrorCode } from "../core/errors";
import { internalLogger } from "../util/logger";
import { TeamsFx } from "../core/teamsfx";

/**
 * MSSQL default scope
 * https://docs.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-connect-msi
 */
const defaultSQLScope = "https://database.windows.net/";

/**
 * Generate connection configuration consumed by tedious.
 *
 * @deprecated we recommend you compose your own Tedious configuration for better flexibility.
 *
 * @param {TeamsFx} teamsfx - Used to provide configuration and auth
 * @param { string? } databaseName - specify database name to override default one if there are multiple databases.
 *
 * @returns Connection configuration of tedious for the SQL.
 *
 * @throws {@link ErrorCode|InvalidConfiguration} when SQL config resource configuration is invalid.
 * @throws {@link ErrorCode|InternalError} when get user MSI token failed or MSI token is invalid.
 * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is browser.
 */
export async function getTediousConnectionConfig(
  teamsfx: TeamsFx,
  databaseName?: string
): Promise<ConnectionConfig> {
  internalLogger.info("Get SQL configuration");

  try {
    isSQLConfigurationValid(teamsfx);
  } catch (err) {
    throw err;
  }

  if (databaseName === "") {
    internalLogger.warn(`SQL database name is empty string`);
  }
  const dbName: string | undefined =
    databaseName ??
    (teamsfx.hasConfig("sqlDatabaseName") ? teamsfx.getConfig("sqlDatabaseName") : undefined);
  if (!isMsiAuthentication(teamsfx)) {
    const configWithUPS = generateDefaultConfig(teamsfx, dbName);
    internalLogger.verbose("SQL configuration with username and password generated");
    return configWithUPS;
  }

  try {
    const configWithToken = await generateTokenConfig(teamsfx, dbName);
    internalLogger.verbose("SQL configuration with MSI token generated");
    return configWithToken;
  } catch (error) {
    throw error;
  }
}

/**
 * check configuration is an available configurations.
 * @param {TeamsFx} teamsfx - Used to provide configuration and auth
 *
 * @returns true - SQL configuration has a valid SQL endpoints, SQL username with password or identity ID.
 *          false - configuration is not valid.
 * @internal
 */
function isSQLConfigurationValid(teamsfx: TeamsFx) {
  internalLogger.verbose("Check SQL configuration if valid");
  if (!teamsfx.hasConfig("sqlServerEndpoint")) {
    internalLogger.error("SQL configuration is not valid without SQL server endpoint exist");
    throw new ErrorWithCode(
      "SQL configuration error without SQL server endpoint exist",
      ErrorCode.InvalidConfiguration
    );
  }
  if (
    !(teamsfx.hasConfig("sqlUsername") && teamsfx.hasConfig("sqlPassword")) &&
    !teamsfx.hasConfig("sqlIdentityId")
  ) {
    const errMsg = `SQL configuration is not valid without ${
      teamsfx.hasConfig("sqlIdentityId") ? "" : "identity id "
    } ${teamsfx.hasConfig("sqlUsername") ? "" : "SQL username "} ${
      teamsfx.hasConfig("sqlPassword") ? "" : "SQL password"
    } exist`;
    internalLogger.error(errMsg);
    throw new ErrorWithCode(errMsg, ErrorCode.InvalidConfiguration);
  }
  internalLogger.verbose("SQL configuration is valid");
}

/**
 * Check SQL use MSI identity or username and password.
 *
 * @param {TeamsFx} teamsfx - Used to provide configuration and auth
 *
 * @returns false - login with SQL MSI identity, true - login with username and password.
 * @internal
 */
function isMsiAuthentication(teamsfx: TeamsFx): boolean {
  internalLogger.verbose("Check connection config using MSI access token or username and password");
  if (teamsfx.hasConfig("sqlUsername") && teamsfx.hasConfig("sqlPassword")) {
    internalLogger.verbose("Login with username and password");
    return false;
  }
  internalLogger.verbose("Login with MSI identity");
  return true;
}

/**
 * Generate tedious connection configuration with default authentication type.
 *
 * @param {TeamsFx} teamsfx - Used to provide configuration and auth
 * @param { string? } databaseName - specify database name to override default one if there are multiple databases.
 *
 * @returns Tedious connection configuration with username and password.
 * @internal
 */
function generateDefaultConfig(teamsfx: TeamsFx, databaseName?: string): ConnectionConfig {
  internalLogger.verbose(
    `SQL server ${teamsfx.getConfig("sqlServerEndpoint")}
    , user name ${teamsfx.getConfig("sqlUsername")}
    , database name ${databaseName ? databaseName : ""}`
  );

  const config = {
    server: teamsfx.getConfig("sqlServerEndpoint"),
    authentication: {
      type: TediousAuthenticationType.default,
      options: {
        userName: teamsfx.getConfig("sqlUsername"),
        password: teamsfx.getConfig("sqlPassword"),
      },
    },
    options: {
      database: databaseName,
      encrypt: true,
    },
  };
  return config;
}

/**
 * Generate tedious connection configuration with azure-active-directory-access-token authentication type.
 *
 * @param {TeamsFx} teamsfx - Used to provide configuration and auth
 *
 * @returns Tedious connection configuration with access token.
 * @internal
 */
async function generateTokenConfig(
  teamsfx: TeamsFx,
  databaseName?: string
): Promise<ConnectionConfig> {
  internalLogger.verbose("Generate tedious config with MSI token");
  let token: AccessToken | null;
  try {
    const credential = new ManagedIdentityCredential(teamsfx.getConfig("sqlIdentityId"));
    token = await credential.getToken(defaultSQLScope);
  } catch (error) {
    const errMsg = "Get user MSI token failed";
    internalLogger.error(errMsg);
    throw new ErrorWithCode(errMsg, ErrorCode.InternalError);
  }
  if (token) {
    const config = {
      server: teamsfx.getConfig("sqlServerEndpoint"),
      authentication: {
        type: TediousAuthenticationType.MSI,
        options: {
          token: token.token,
        },
      },
      options: {
        database: databaseName,
        encrypt: true,
      },
    };
    internalLogger.verbose(
      `Generate token configuration success
      , server endpoint is ${teamsfx.getConfig("sqlServerEndpoint")}
      , database name is ${databaseName ? databaseName : ""}`
    );
    return config;
  }
  internalLogger.error(
    `Generate token configuration
    , server endpoint is ${teamsfx.getConfig("sqlServerEndpoint")}
    , MSI token is not valid`
  );
  throw new ErrorWithCode("MSI token is not valid", ErrorCode.InternalError);
}

/**
 * tedious connection config authentication type.
 * https://tediousjs.github.io/tedious/api-connection.html
 * @internal
 */
enum TediousAuthenticationType {
  default = "default",
  MSI = "azure-active-directory-access-token",
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getResourceConfiguration } from "./configurationProvider";
import { ResourceType } from "../models/configuration";
import { AccessToken, ManagedIdentityCredential } from "@azure/identity";
import { ErrorWithCode, ErrorCode } from "./errors";
import { ConnectionConfig } from "tedious";
import { internalLogger } from "../util/logger";

/**
 * SQL connection configuration instance.
 *
 * @beta
 *
 */
export class DefaultTediousConnectionConfiguration {
  /**
   * MSSQL default scope
   * https://docs.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-connect-msi
   */
  private readonly defaultSQLScope: string = "https://database.windows.net/";

  /**
   * Generate connection configuration consumed by tedious.
   * 
   * @returns Configuration items to the user for tedious to connection to the SQL.
   * 
   * @throws {@link ErrorCode|InvalidConfiguration} when sql config resource configuration is invalid.
   * @throws {@link ErrorCode|InternalError} when get user MSI token failed or MSI token is invalid.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is browser.
   * 
   * @beta
   */
  public async getConfig(): Promise<ConnectionConfig> {
    internalLogger.info("Get SQL configuration");
    const configuration = <SqlConfiguration>getResourceConfiguration(ResourceType.SQL);

    if (!configuration) {
      const errMsg = "SQL resource configuration not exist";
      internalLogger.error(errMsg);
      throw new ErrorWithCode(errMsg, ErrorCode.InvalidConfiguration);
    }

    try {
      this.isSQLConfigurationValid(configuration);
    } catch (err) {
      throw err;
    }

    if (!this.isMsiAuthentication()) {
      const configWithUPS = this.generateDefaultConfig(configuration);
      internalLogger.verbose("SQL configuration with username and password generated");
      return configWithUPS;
    }

    try {
      const configWithToken = await this.generateTokenConfig(configuration);
      internalLogger.verbose("SQL configuration with MSI token generated");
      return configWithToken;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check SQL use MSI identity or username and password.
   *
   * @returns false - login with SQL MSI identity, true - login with username and password.
   * @internal
   */
  private isMsiAuthentication(): boolean {
    internalLogger.verbose(
      "Check connection config using MSI access token or username and password"
    );
    const configuration = <SqlConfiguration>getResourceConfiguration(ResourceType.SQL);
    if (configuration?.sqlUsername != null && configuration?.sqlPassword != null) {
      internalLogger.verbose("Login with username and password");
      return false;
    }
    internalLogger.verbose("Login with MSI identity");
    return true;
  }

  /**
   * check configuration is an available configurations.
   * @param { SqlConfiguration } sqlConfig
   *
   * @returns true - sql configuration has a valid SQL endpoints, SQL username with password or identity ID.
   *          false - configuration is not valid.
   * @internal
   */
  private isSQLConfigurationValid(sqlConfig: SqlConfiguration) {
    internalLogger.verbose("Check SQL configuration if valid");
    if (!sqlConfig.sqlServerEndpoint) {
      internalLogger.error("SQL configuration is not valid without SQL server endpoint exist");
      throw new ErrorWithCode(
        "SQL configuration error without SQL server endpoint exist",
        ErrorCode.InvalidConfiguration
      );
    }
    if (!(sqlConfig.sqlUsername && sqlConfig.sqlPassword) && !sqlConfig.sqlIdentityId) {
      const errMsg = `SQL configuration is not valid without ${sqlConfig.sqlIdentityId ? "" : "identity id "
        } ${sqlConfig.sqlUsername ? "" : "SQL username "} ${sqlConfig.sqlPassword ? "" : "SQL password"
        } exist`;
      internalLogger.error(errMsg);
      throw new ErrorWithCode(errMsg, ErrorCode.InvalidConfiguration);
    }
    internalLogger.verbose("SQL configuration is valid");
  }

  /**
   * Generate tedious connection configuration with default authentication type.
   *
   * @param { SqlConfiguration } sqlConfig sql configuration with username and password.
   *
   * @returns Tedious connection configuration with username and password.
   * @internal
   */
  private generateDefaultConfig(sqlConfig: SqlConfiguration): ConnectionConfig {
    internalLogger.verbose(
      `SQL server ${sqlConfig.sqlServerEndpoint}, user name ${sqlConfig.sqlUsername}, database name ${sqlConfig.sqlDatabaseName}`
    );

    const config = {
      server: sqlConfig.sqlServerEndpoint,
      authentication: {
        type: TediousAuthenticationType.default,
        options: {
          userName: sqlConfig.sqlUsername,
          password: sqlConfig.sqlPassword
        }
      },
      options: {
        database: sqlConfig.sqlDatabaseName,
        encrypt: true
      }
    };
    return config;
  }

  /**
   * Generate tedious connection configuration with azure-active-directory-access-token authentication type.
   *
   * @param { SqlConfiguration } sqlConfig sql configuration with AAD access token.
   *
   * @returns Tedious connection configuration with access token.
   * @internal
   */
  private async generateTokenConfig(sqlConfig: SqlConfiguration): Promise<ConnectionConfig> {
    internalLogger.verbose("Generate tedious config with MSI token");

    let token: AccessToken | null;
    try {
      const credential = new ManagedIdentityCredential(sqlConfig.sqlIdentityId);
      token = await credential.getToken(this.defaultSQLScope);
    } catch (error) {
      const errMsg = "Get user MSI token failed";
      internalLogger.error(errMsg);
      throw new ErrorWithCode(errMsg, ErrorCode.InternalError);
    }
    if (token) {
      const config = {
        server: sqlConfig.sqlServerEndpoint,
        authentication: {
          type: TediousAuthenticationType.MSI,
          options: {
            token: token.token
          }
        },
        options: {
          database: sqlConfig.sqlDatabaseName,
          encrypt: true
        }
      };
      internalLogger.verbose(
        `Generate token configuration success, server endpoint is ${sqlConfig.sqlServerEndpoint}, database name is ${sqlConfig.sqlDatabaseName}`
      );
      return config;
    }
    internalLogger.error(
      `Generate token configuration, server endpoint is ${sqlConfig.sqlServerEndpoint}, MSI token is not valid`
    );
    throw new ErrorWithCode("MSI token is not valid", ErrorCode.InternalError);
  }
}

/**
 * tedious connection config authentication type.
 * https://tediousjs.github.io/tedious/api-connection.html
 * @internal
 */
enum TediousAuthenticationType {
  default = "default",
  MSI = "azure-active-directory-access-token"
}

/**
 * Configuration for SQL resource.
 * @internal
 */
interface SqlConfiguration {
  /**
   * SQL server endpoint.
   *
   * @readonly
   */
  readonly sqlServerEndpoint: string;

  /**
   * SQL server username.
   *
   * @readonly
   */
  readonly sqlUsername: string;

  /**
   * SQL server password.
   *
   * @readonly
   */
  readonly sqlPassword: string;

  /**
   * SQL server database name.
   *
   * @readonly
   */
  readonly sqlDatabaseName: string;

  /**
   * Managed identity id.
   *
   * @readonly
   */
  readonly sqlIdentityId: string;
}

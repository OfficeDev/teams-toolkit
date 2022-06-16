// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as tedious from "tedious";
import { Constants, HelpLinks } from "../constants";
import { AzureAccountProvider } from "@microsoft/teamsfx-api";
import { ErrorMessage } from "../errors";
import { SqlResultFactory } from "../results";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { SqlConfig } from "../types";

export class SqlClient {
  config: SqlConfig;
  token: string;

  private constructor(config: SqlConfig, token: string) {
    this.config = config;
    this.token = token;
  }

  static async create(
    azureAccountProvider: AzureAccountProvider,
    config: SqlConfig
  ): Promise<SqlClient> {
    const token = await SqlClient.initToken(azureAccountProvider, config);
    return new SqlClient(config, token);
  }

  async addDatabaseUser(database: string): Promise<void> {
    try {
      let query: string;
      query = `IF NOT EXISTS (SELECT name FROM [sys].[database_principals] WHERE name='${this.config.identity}')
      BEGIN
      CREATE USER [${this.config.identity}] FROM EXTERNAL PROVIDER;
      END;`;
      await this.doQuery(query, database);
      query = `sp_addrolemember 'db_datareader', '${this.config.identity}'`;
      await this.doQuery(query, database);
      query = `sp_addrolemember 'db_datawriter', '${this.config.identity}'`;
      await this.doQuery(query, database);
    } catch (error) {
      const link = HelpLinks.default;
      if (error?.message?.includes(ErrorMessage.GuestAdminMessage)) {
        const errorMessage = ErrorMessage.DatabaseUserCreateError.message(
          database,
          this.config.identity
        );
        const e = SqlResultFactory.UserError(
          ErrorMessage.DatabaseUserCreateError.name,
          [errorMessage[0], errorMessage[1] + `. ${ErrorMessage.GuestAdminError}`],
          error,
          undefined,
          link
        );
        e.message += ` ${ErrorMessage.LinkHelpMessage(link)}`;
        throw e;
      } else {
        const errorMessage = ErrorMessage.DatabaseUserCreateError.message(
          database,
          this.config.identity
        );
        const e = SqlResultFactory.UserError(
          ErrorMessage.DatabaseUserCreateError.name,
          [errorMessage[0], errorMessage[1] + `. ${getLocalizedString("error.sql.GetDetail")}`],
          error,
          undefined,
          link
        );
        e.message += ` ${ErrorMessage.LinkHelpMessage(link)}`;
        throw e;
      }
    }
  }

  static async initToken(
    azureAccountProvider: AzureAccountProvider,
    config: SqlConfig
  ): Promise<string> {
    const credential = await azureAccountProvider.getIdentityCredentialAsync();
    const databaseNames = `(${config.databases.join(",")})`;
    if (!credential) {
      const link = HelpLinks.default;
      const reason = ErrorMessage.IdentityCredentialUndefine(config.identity, databaseNames);
      const message = ErrorMessage.DatabaseUserCreateError.message(databaseNames, config.identity);
      message[0] += `. ${reason}`;
      message[1] += `. ${reason}`;
      throw SqlResultFactory.UserError(
        ErrorMessage.DatabaseUserCreateError.name,
        [message[0] + ` ${ErrorMessage.LinkHelpMessage(link)}`, message[1]],
        undefined,
        undefined,
        link
      );
    }
    try {
      const accessToken = await credential!.getToken(Constants.azureSqlScope);
      return accessToken!.token;
    } catch (error) {
      const link = HelpLinks.default;
      if (error?.message?.includes(ErrorMessage.DomainCode)) {
        const errorMessage = ErrorMessage.DatabaseUserCreateError.message(
          databaseNames,
          config.identity
        );
        const e = SqlResultFactory.UserError(
          ErrorMessage.DatabaseUserCreateError.name,
          [
            errorMessage[0] + `. ${ErrorMessage.DomainError}`,
            errorMessage[1] + `. ${ErrorMessage.DomainError}`,
          ],
          error,
          undefined,
          link
        );
        e.message += ` ${ErrorMessage.LinkHelpMessage(link)}`;
        throw e;
      } else {
        const errorMessage = ErrorMessage.DatabaseUserCreateError.message(
          databaseNames,
          config.identity
        );
        const e = SqlResultFactory.UserError(
          ErrorMessage.DatabaseUserCreateError.name,
          [errorMessage[0], errorMessage[1] + `. ${getLocalizedString("error.sql.GetDetail")}`],
          error,
          undefined,
          link
        );
        e.message += `Reason: ${error.message}. ${ErrorMessage.LinkHelpMessage(link)}`;
        throw e;
      }
    }
  }

  async doQuery(cmd: string, database: string): Promise<any[]> {
    const config = {
      server: this.config.sqlEndpoint,
      authentication: {
        type: "azure-active-directory-access-token",
        options: {
          token: this.token,
        },
      },
      options: {
        debug: {
          packet: true,
          data: true,
          payload: true,
          token: false,
          log: true,
        },
        rowCollectionOnDone: true,
        database: database,
        encrypt: true,
        requestTimeout: 30000,
        connectTimeout: 30000,
      },
    };
    const connection = new tedious.Connection(config);
    return new Promise((resolve, reject) => {
      connection.connect((err: any) => {
        if (err) {
          reject(err);
        }
      });
      connection.on("connect", (err: any) => {
        if (err) {
          reject(err);
        }
        const request = new tedious.Request(cmd, (err: any) => {
          if (err) {
            reject(err);
          }
        });
        let res: any[];
        request.on("doneInProc", function (rowCount: any, more: any, rows: any[]) {
          res = rows;
        });
        request.on("requestCompleted", () => {
          connection.close();
          resolve(res);
        });
        request.on("error", (error: any) => {
          reject(error);
        });
        connection.execSql(request);
      });
      connection.on("error", (err: any) => {
        reject(err);
      });
    });
  }

  public static isFireWallError(error: any): boolean {
    if (error?.code === "ELOGIN" && error?.message?.match(ErrorMessage.FirewallErrorReg)) {
      return true;
    }
    return false;
  }
}

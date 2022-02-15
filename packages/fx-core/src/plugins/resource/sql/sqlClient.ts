// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as tedious from "tedious";
import { Constants, HelpLinks } from "./constants";
import { SqlConfig } from "./config";
import { AzureAccountProvider } from "@microsoft/teamsfx-api";
import { ErrorMessage } from "./errors";
import { SqlResultFactory } from "./results";
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
      await this.doQuery(this.token, query, database);
      query = `sp_addrolemember 'db_datareader', '${this.config.identity}'`;
      await this.doQuery(this.token, query, database);
      query = `sp_addrolemember 'db_datawriter', '${this.config.identity}'`;
      await this.doQuery(this.token, query, database);
    } catch (error) {
      const link = HelpLinks.default;
      if (error?.message?.includes(ErrorMessage.GuestAdminMessage)) {
        const errorMessage = ErrorMessage.DatabaseUserCreateError.message(
          database,
          this.config.identity
        );
        const e = SqlResultFactory.UserError(
          ErrorMessage.DatabaseUserCreateError.name,
          errorMessage,
          error,
          undefined,
          link,
          errorMessage + `. ${ErrorMessage.GuestAdminError}`
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
          errorMessage,
          error,
          undefined,
          link,
          errorMessage + `. ${ErrorMessage.GetDetail}`
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
      let message = ErrorMessage.DatabaseUserCreateError.message(databaseNames, config.identity);
      message += `. ${reason}`;
      throw SqlResultFactory.UserError(
        ErrorMessage.DatabaseUserCreateError.name,
        message + ` ${ErrorMessage.LinkHelpMessage(link)}`,
        undefined,
        undefined,
        link,
        message
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
          errorMessage,
          error,
          undefined,
          link,
          errorMessage + `. ${ErrorMessage.DomainError}`
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
          errorMessage,
          error,
          undefined,
          link,
          errorMessage + `. ${ErrorMessage.GetDetail}`
        );
        e.message += ` ${ErrorMessage.LinkHelpMessage(link)}`;
        throw e;
      }
    }
  }

  async doQuery(token: string, cmd: string, database: string): Promise<any[]> {
    const config = {
      server: this.config.sqlEndpoint,
      authentication: {
        type: "azure-active-directory-access-token",
        options: {
          token: token,
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

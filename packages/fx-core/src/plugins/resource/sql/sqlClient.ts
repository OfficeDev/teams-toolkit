// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as tedious from "tedious";
import { Constants, HelpLinks } from "./constants";
import { SqlConfig } from "./config";
import { PluginContext } from "@microsoft/teamsfx-api";
import { ErrorMessage } from "./errors";
import { SqlResultFactory } from "./results";
export class SqlClient {
  config: SqlConfig;
  token: string;
  ctx: PluginContext;

  private constructor(ctx: PluginContext, config: SqlConfig, token: string) {
    this.ctx = ctx;
    this.config = config;
    this.token = token;
  }

  static async create(ctx: PluginContext, config: SqlConfig): Promise<SqlClient> {
    const token = await SqlClient.initToken(ctx, config);
    return new SqlClient(ctx, config, token);
  }

  async existUser(): Promise<boolean> {
    try {
      const query = `SELECT count(*) FROM [sys].[database_principals] WHERE [name] = N'${this.config.identity}';`;
      const res = await this.doQuery(this.token, query);
      if (res.length && res[0][0].value !== 0) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      if (error?.message?.includes(ErrorMessage.AccessMessage)) {
        this.ctx.logProvider?.error(
          ErrorMessage.SqlAccessError.message(this.config.identity, error.message)
        );
        throw SqlResultFactory.UserError(
          ErrorMessage.SqlAccessError.name,
          ErrorMessage.SqlAccessError.message(this.config.identity, error.message),
          error,
          undefined,
          HelpLinks.default
        );
      } else {
        this.ctx.logProvider?.error(
          ErrorMessage.SqlCheckDBUserError.message(this.config.identity, error.message)
        );
        throw SqlResultFactory.UserError(
          ErrorMessage.SqlCheckDBUserError.name,
          ErrorMessage.SqlCheckDBUserError.message(this.config.identity, error.message),
          error
        );
      }
    }
  }

  async addDatabaseUser() {
    try {
      let query: string;
      query = `CREATE USER [${this.config.identity}] FROM EXTERNAL PROVIDER;`;
      await this.doQuery(this.token, query);
      query = `sp_addrolemember 'db_datareader', '${this.config.identity}'`;
      await this.doQuery(this.token, query);
      query = `sp_addrolemember 'db_datawriter', '${this.config.identity}'`;
      await this.doQuery(this.token, query);
    } catch (error) {
      const link = HelpLinks.default;
      if (error?.message?.includes(ErrorMessage.GuestAdminMessage)) {
        const logMessage = ErrorMessage.DatabaseUserCreateError.message(
          this.config.sqlServer,
          this.config.databaseName,
          this.config.identity,
          error.message
        );
        this.ctx.logProvider?.error(logMessage + ` You can follow ${link} to handle it`);
        const message = ErrorMessage.DatabaseUserCreateError.message(
          this.config.sqlServer,
          this.config.databaseName,
          this.config.identity,
          ErrorMessage.GuestAdminError
        );
        throw SqlResultFactory.UserError(
          ErrorMessage.DatabaseUserCreateError.name,
          message,
          error,
          undefined,
          link
        );
      } else {
        const logMessage = ErrorMessage.DatabaseUserCreateError.message(
          this.config.sqlServer,
          this.config.databaseName,
          this.config.identity,
          error.message
        );
        this.ctx.logProvider?.error(logMessage + ` You can follow ${link} to handle it`);
        const message = ErrorMessage.DatabaseUserCreateError.message(
          this.config.sqlServer,
          this.config.databaseName,
          this.config.identity,
          `add database user failed. ${ErrorMessage.GetDetail}`
        );
        throw SqlResultFactory.UserError(
          ErrorMessage.DatabaseUserCreateError.name,
          message,
          error,
          undefined,
          link
        );
      }
    }
  }

  static async initToken(ctx: PluginContext, config: SqlConfig): Promise<string> {
    const credential = await ctx.azureAccountProvider!.getIdentityCredentialAsync();
    if (!credential) {
      const link = HelpLinks.default;
      const reason = ErrorMessage.IdentityCredentialUndefine(config.identity, config.databaseName);
      const message = ErrorMessage.DatabaseUserCreateError.message(
        config.sqlServer,
        config.databaseName,
        config.identity,
        reason
      );
      ctx.logProvider?.error(message + ` You can follow ${link} to handle it`);
      throw SqlResultFactory.UserError(
        ErrorMessage.DatabaseUserCreateError.name,
        message,
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
        const logMessage = ErrorMessage.DatabaseUserCreateError.message(
          config.sqlServer,
          config.databaseName,
          config.identity,
          error.message
        );
        ctx.logProvider?.error(logMessage + ` You can follow ${link} to handle it`);
        const message = ErrorMessage.DatabaseUserCreateError.message(
          config.sqlServer,
          config.databaseName,
          config.identity,
          ErrorMessage.DomainError
        );
        throw SqlResultFactory.UserError(
          ErrorMessage.DatabaseUserCreateError.name,
          message,
          error,
          undefined,
          link
        );
      } else {
        const logMessage = ErrorMessage.DatabaseUserCreateError.message(
          config.sqlServer,
          config.databaseName,
          config.identity,
          error.message
        );
        ctx.logProvider?.error(logMessage + ` You can follow ${link} to handle it`);
        const message = ErrorMessage.DatabaseUserCreateError.message(
          config.sqlServer,
          config.databaseName,
          config.identity,
          `access database failed. ${ErrorMessage.GetDetail}`
        );
        throw SqlResultFactory.UserError(
          ErrorMessage.DatabaseUserCreateError.name,
          message,
          error,
          undefined,
          link
        );
      }
    }
  }

  async doQuery(token: string, cmd: string): Promise<any[]> {
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
        database: this.config.databaseName,
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
}

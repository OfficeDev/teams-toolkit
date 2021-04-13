// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as tedious from "tedious";
import { Constants, HelpLinks } from "./constants";
import { SqlConfig } from "./config";
import { PluginContext } from "fx-api";
import { ErrorMessage } from "./errors";
import { SqlResultFactory } from "./results";
export class SqlClient {
    conn?: tedious.Connection;
    config: SqlConfig;
    token?: string;
    ctx: PluginContext;
    constructor(ctx: PluginContext, config: SqlConfig) {
        this.ctx = ctx;
        this.config = config;
    }

    async existUser(): Promise<boolean> {
        try {
            const query = `SELECT count(*) FROM [sys].[database_principals] WHERE [name] = N'${this.config.identity}';`;
            const res = await this.doQuery(this.token!, query);
            if (res.length && res[0][0].value !== 0) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            this.ctx.logProvider?.error(ErrorMessage.SqlCheckDBUserError.message(this.config.identity, error.message));
            throw SqlResultFactory.SystemError(ErrorMessage.SqlCheckDBUserError.name, ErrorMessage.SqlCheckDBUserError.message(this.config.identity, error.message), error);
        }
    }

    async addDatabaseUser() {
        try {
            let query: string;
            query = `CREATE USER [${this.config.identity}] FROM EXTERNAL PROVIDER;`;
            await this.doQuery(this.token!, query);
            query = `sp_addrolemember 'db_datareader', '${this.config.identity}'`;
            await this.doQuery(this.token!, query);
            query = `sp_addrolemember 'db_datawriter', '${this.config.identity}'`;
            await this.doQuery(this.token!, query);
        } catch (error) {
            const link = HelpLinks.addDBUser;
            const message = ErrorMessage.DatabaseUserCreateError.message(this.config.sqlServer, this.config.databaseName, this.config.identity, error.message);
            this.ctx.logProvider?.error(message + ` You can follow ${link} to handle it`);
            throw SqlResultFactory.UserError(ErrorMessage.DatabaseUserCreateError.name, message, error, undefined, link);
        }
    }

    async initToken() {
        if (!this.token) {
            const credential = await this.ctx.azureAccountProvider!.getIdentityCredentialAsync();
            if (!credential) {
                const link = HelpLinks.addDBUser;
                const reason = ErrorMessage.IdentityCredentialUndefine(this.ctx.platform as string, this.config.identity, this.config.databaseName);
                const message = ErrorMessage.DatabaseUserCreateError.message(this.config.sqlServer, this.config.databaseName, this.config.identity, reason);
                this.ctx.logProvider?.error(message + ` You can follow ${link} to handle it`);
                throw SqlResultFactory.UserError(ErrorMessage.DatabaseUserCreateError.name, message, undefined, undefined, link);
            } 
            try {
                const accessToken = await credential!.getToken(Constants.azureSqlScope);
                this.token = accessToken!.token;
            } catch (error) {
                const link = HelpLinks.addDBUser;
                const message = ErrorMessage.DatabaseUserCreateError.message(this.config.sqlServer, this.config.databaseName, this.config.identity, `access database failed for ${error.message}`);
                this.ctx.logProvider?.error(message + ` You can follow ${link} to handle it`);
                throw SqlResultFactory.UserError(ErrorMessage.DatabaseUserCreateError.name, message, error, undefined, link);
            }
        }
    }

    async doQuery(token: string, cmd: string): Promise<any[]> {
        const config = {
            server: this.config.sqlEndpoint,
            authentication: {
                type: "azure-active-directory-access-token",
                options: {
                    token: token
                }
            }, options: {
                debug: {
                    packet: true,
                    data: true,
                    payload: true,
                    token: false,
                    log: true
                },
                rowCollectionOnDone: true,
                database: this.config.databaseName,
                encrypt: true,
                requestTimeout: 30000,
                connectTimeout: 30000,
            }
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
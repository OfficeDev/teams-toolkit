// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import { SqlManagementClient, SqlManagementModels } from "@azure/arm-sql";
import * as chai from "chai";
import * as tedious from "tedious";

import MockAzureAccountProvider from "./mockAzureAccountProvider";

const echoIpAddress = "https://api.ipify.org";
const localRule = "AllowLocal";
const azureSqlScope = "https://database.windows.net//.default";

const solutionPluginName = "solution";
const sqlPluginName = "fx-resource-azure-sql";
const identityPluginName = "fx-resource-identity";

const subscriptionKey = "subscriptionId";
const rgKey = "resourceGroupName";
const sqlKey = "sqlEndpoint";
const databaseKey = "databaseName";
const identityKey = "identity";

export class SqlValidator {
  static client?: SqlManagementClient;
  static subscriptionId?: string;
  static rg?: string;
  static sqlEndpoint?: string;
  static sqlName?: string;
  static databaseName?: string;
  static identity?: string;
  static accessToken?: string;

  public static async init(ctx: any) {
    console.log("Start to init validator for sql.");
    this.getConfig(ctx);
    const tokenCredential = await MockAzureAccountProvider.getAccountCredentialAsync();

    const sqlCredential = await MockAzureAccountProvider.getIdentityCredentialAsync();
    const sqlToken = await sqlCredential!.getToken(azureSqlScope);
    this.accessToken = sqlToken!.token;
    this.client = new SqlManagementClient(tokenCredential!, this.subscriptionId!);
    await this.addLocalFirewall();
    console.log("Successfully init validator for Azure AD app.");
  }

  public static async validateSql() {
    const query = `select name as username from sys.database_principals where type not in ('A', 'G', 'R', 'X') and sid is not null and name = '${this.identity}';`;
    const res = await this.doQuery(this.accessToken!, query);
    console.log(res.length);
    chai.expect(res.length).to.equal(1);
  }

  private static getConfig(ctx: any) {
    this.subscriptionId = ctx[solutionPluginName][subscriptionKey];
    this.rg = ctx[solutionPluginName][rgKey];
    this.sqlEndpoint = ctx[sqlPluginName][sqlKey];
    this.databaseName = ctx[sqlPluginName][databaseKey];
    this.identity = ctx[identityPluginName][identityKey];
    this.sqlName = this.sqlEndpoint!.substring(0, this.sqlEndpoint!.indexOf("."));
  }

  private static async addLocalFirewall() {
    const response = await axios.get(echoIpAddress);
    const localIp: string = response.data;
    const startIp: string = localIp.substring(0, localIp.lastIndexOf(".")) + ".1";
    const endIp: string = localIp.substring(0, localIp.lastIndexOf(".")) + ".255";
    const model: SqlManagementModels.FirewallRule = {
      startIpAddress: startIp,
      endIpAddress: endIp,
    };
    await this.client!.firewallRules.createOrUpdate(this.rg!, this.sqlName!, localRule, model);
  }

  private static async doQuery(token: string, cmd: string): Promise<any[]> {
    const config = {
      server: this.sqlEndpoint,
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
        database: this.databaseName,
        encrypt: true,
        requestTimeout: 30000,
        connectTimeout: 30000,
      },
    };
    const connection = new tedious.Connection(config);
    return new Promise((resolve, reject) => {
      connection.on("connect", (err) => {
        if (err) {
          reject(err);
        }
        const request = new tedious.Request(cmd, (err) => {
          if (err) {
            reject(err);
          }
        });
        let res: any[];
        request.on("doneInProc", function (rowCount, more, rows) {
          res = rows;
        });
        request.on("requestCompleted", () => {
          connection.close();
          resolve(res);
        });
        request.on("error", (error) => {
          reject(error);
        });
        connection.execSql(request);
      });
      connection.on("error", (err) => {
        reject(err);
      });
    });
  }
}

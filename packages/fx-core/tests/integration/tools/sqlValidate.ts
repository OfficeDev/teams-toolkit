// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { SqlManagementClient, SqlManagementModels } from "@azure/arm-sql";
import * as chai from "chai";
import { MockAzureAccountProvider } from "./azure";
import * as tedious from "tedious";

const axios = require("axios");

const echoIpAddress: string = "https://api.ipify.org";
const localRule: string = "AllowLocal";
const azureSqlScope: string = "https://database.windows.net//.default";

const solutionPluginName: string = "solution";
const sqlPluginName: string = "mods-toolkit-plugin-azure-sql";
const identityPluginName: string = "mods-toolkit-plugin-identity";

const subscriptionKey: string = "subscriptionId";
const rgKey: string = "resourceGroupName";
const sqlKey: string = "sqlEndpoint";
const databaseKey: string = "databaseName";
const identityKey: string = "identity";

export class SqlValidator {
  static client?: SqlManagementClient;
  static subscriptionId?: string;
  static rg?: string;
  static sqlEndpoint?: string;
  static sqlName?: string;
  static databaseName?: string;
  static identity?: string;
  static accessToken?: string;

  public static async init(ctx: object) {
    console.log("Start to init validator for sql.");
    this.getConfig(ctx);
    let tokenProvider: MockAzureAccountProvider = MockAzureAccountProvider.getInstance();
    let tokenCredential = await tokenProvider.getAccountCredentialAsync();

    let sqlCredential = await tokenProvider.getIdentityCredentialAsync();
    let sqlToken = await sqlCredential!.getToken(azureSqlScope);
    this.accessToken = sqlToken!.token;
    this.client = new SqlManagementClient(
      tokenCredential!,
      this.subscriptionId!
    );
    await this.addLocalFirewall();
    console.log("Successfully init validator for Azure AD app.");
  }

  public static async validateSql() {
    let query = `select name as username from sys.database_principals where type not in ('A', 'G', 'R', 'X') and sid is not null and name = '${this.identity}';`;
    let res = await this.doQuery(this.accessToken!, query);
    chai.expect(res.length).to.equal(1);
  }

  private static getConfig(ctx: object) {
    this.subscriptionId = ctx[solutionPluginName][subscriptionKey];
    this.rg = ctx[solutionPluginName][rgKey];
    this.sqlEndpoint = ctx[sqlPluginName][sqlKey];
    this.databaseName = ctx[sqlPluginName][databaseKey];
    this.identity = ctx[identityPluginName][identityKey];
    this.sqlName = this.sqlEndpoint!.substring(
      0,
      this.sqlEndpoint!.indexOf(".")
    );
  }

  private static async addLocalFirewall() {
    let response = await axios.get(echoIpAddress);
    let localIp: string = response.data;
    let startIp: string = localIp.substring(0, localIp.lastIndexOf(".")) + ".1";
    let endIp: string = localIp.substring(0, localIp.lastIndexOf(".")) + ".255";
    let model: SqlManagementModels.FirewallRule = {
      startIpAddress: startIp,
      endIpAddress: endIp,
    };
    await this.client!.firewallRules.createOrUpdate(
      this.rg!,
      this.sqlName!,
      localRule,
      model
    );
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
        var res: any[];
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


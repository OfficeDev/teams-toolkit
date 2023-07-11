// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import { FirewallRule, SqlManagementClient } from "@azure/arm-sql";
import * as chai from "chai";
import * as tedious from "tedious";

import MockAzureAccountProvider from "@microsoft/teamsfx-cli/src/commonlib/azureLoginUserPassword";
import {
  getResourceGroupNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "./utilities";

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
const identityKey = "identityName";
const sqlResourceIdKey = "sqlResourceId";

export class SqlValidator {
  static client?: SqlManagementClient;
  static subscriptionId?: string;
  static rg?: string;
  static sqlEndpoint?: string;
  static sqlName?: string;
  static databaseName?: string;
  static identity?: string;
  static accessToken?: string;
  static databases: string[] = [];

  public static async init(ctx: any) {
    console.log("Start to init validator for sql.");
    this.getConfig(ctx);
    const sqlCredential =
      await MockAzureAccountProvider.getIdentityCredentialAsync();
    const sqlToken = await sqlCredential!.getToken(azureSqlScope);
    this.accessToken = sqlToken!.token;
    this.client = new SqlManagementClient(sqlCredential!, this.subscriptionId!);
    await this.addLocalFirewall();
    console.log("Successfully init validator for Azure AD app.");
  }

  public static async validateSql(count = 1) {
    const query = `select name as username from sys.database_principals where type not in ('A', 'G', 'R', 'X') and sid is not null and name = '${this.identity}';`;
    for (let i = 0; i < this.databases.length; i++) {
      const database = this.databases[i];
      const res = await this.doQuery(this.accessToken!, query, database);
      chai.expect(res.length).to.equal(count);
    }
  }

  public static async validateDatabaseCount(count: number) {
    chai.expect(this.databases.length).to.equal(count);
  }

  public static async validateResourceGroup(rg: string) {
    chai.expect(this.rg).to.equal(rg);
  }

  private static getConfig(ctx: any) {
    const sqlResourceId = ctx[sqlPluginName][sqlResourceIdKey];
    this.subscriptionId = getSubscriptionIdFromResourceId(sqlResourceId);
    this.rg = getResourceGroupNameFromResourceId(sqlResourceId);
    this.sqlEndpoint = ctx[sqlPluginName][sqlKey];
    this.databaseName = ctx[sqlPluginName][databaseKey];
    this.identity = ctx[identityPluginName][identityKey];
    this.sqlName = this.sqlEndpoint!.substring(
      0,
      this.sqlEndpoint!.indexOf(".")
    );
    const keys = Object.keys(ctx[sqlPluginName]);
    keys.forEach((key) => {
      if (key.startsWith("databaseName")) {
        this.databases.push(ctx[sqlPluginName][key]);
      }
    });
  }

  private static async addLocalFirewall() {
    const response = await axios.get(echoIpAddress);
    const localIp: string = response.data;
    const startIp: string =
      localIp.substring(0, localIp.lastIndexOf(".")) + ".1";
    const endIp: string =
      localIp.substring(0, localIp.lastIndexOf(".")) + ".255";
    const model: FirewallRule = {
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

  private static async doQuery(
    token: string,
    cmd: string,
    database: string
  ): Promise<any[]> {
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

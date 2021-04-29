// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import axios from "axios";
import { assert, use as chaiUse } from "chai";
import { SqlManagementClient, SqlManagementModels } from "@azure/arm-sql";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import chaiPromises from "chai-as-promised";
import { Connection, Request } from "tedious";
import { loadConfiguration, DefaultTediousConnectionConfiguration } from "../../../src";
import { MockEnvironmentVariable, RestoreEnvironmentVariable } from "../helper";

chaiUse(chaiPromises);
let restore: () => void;

describe("SqlConnector Tests - Node", () => {
  let connection: Connection;
  // let sqlManagerClient: SqlManagementClient;
  // let resourceGroup: string | undefined;
  // let sqlName: string | undefined;
  // let subscriptionId: string | undefined;
  before(async () => {
    restore = MockEnvironmentVariable();
    loadConfiguration();
    // resourceGroup = process.env.SDK_INTEGRATION_RESOURCE_GROUP_NAME;
    // subscriptionId = process.env.SDK_INTEGRATION_TEST_ACCOUNT_SUBSCRIPTION_ID;
    // const sqlEndpoint: string | undefined = process.env.SDK_INTEGRATION_SQL_ENDPOINT;
    // sqlName = sqlEndpoint!.slice(0, sqlEndpoint!.indexOf("."));

    // const tokenCredential = await getSQLManagerClient();
    // sqlManagerClient = new SqlManagementClient(tokenCredential!, subscriptionId!);
    // await addLocalFirewall(sqlManagerClient, resourceGroup!, sqlName!);
  });
  after(async () => {
    RestoreEnvironmentVariable(restore);
    // await clearUpLocalFirewall(sqlManagerClient, resourceGroup!, sqlName!);
  });
  it("SqlConnector: Local connect success", async function () {
    connection = await getSQLConnection();
    const query = "select system_user as u, sysdatetime() as t";
    const result = await execQuery(query, connection);
    const userName = process.env.SDK_INTEGRATION_SQL_USER_NAME;
    assert.isNotNull(result);
    assert.isArray(result);
    assert.strictEqual(result![0]![0], userName);

    connection.close();
  });
});

const echoIpAddress = "https://api.ipify.org";
const localRule = "FirewallAllowLocalIP";

async function getSQLManagerClient(): Promise<msRestNodeAuth.UserTokenCredentials | undefined> {
  const username: string | undefined = process.env.SDK_INTEGRATION_TEST_ACCOUNT_NAME;
  const password: string | undefined = process.env.SDK_INTEGRATION_TEST_ACCOUNT_PASSWORD;
  const authres = await msRestNodeAuth.loginWithUsernamePassword(username!, password!);
  return authres;
}

async function addLocalFirewall(client: SqlManagementClient, rg: string, sqlName: string) {
  const response = await axios.get(echoIpAddress);
  const localIp: string = response.data;
  const model: SqlManagementModels.FirewallRule = {
    startIpAddress: localIp,
    endIpAddress: localIp
  };
  await client!.firewallRules!.createOrUpdate(rg, sqlName, localRule, model);
}

async function clearUpLocalFirewall(client: SqlManagementClient, rg: string, sqlName: string) {
  await client!.firewallRules!.deleteMethod(rg, sqlName, localRule);
}

async function getSQLConnection(): Promise<Connection> {
  const sqlConnectConfig = new DefaultTediousConnectionConfiguration();
  const config = await sqlConnectConfig.getConfig();
  const connection = new Connection(config);
  return new Promise((resolve, reject) => {
    connection.on("connect", (error) => {
      if (error) {
        console.log(error);
        reject(connection);
      }
      resolve(connection);
    });
  });
}

async function execQuery(query: string, connection: Connection): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const res: any[] = [];
    const request = new Request(query, (err) => {
      if (err) {
        throw err;
      }
    });

    request.on("row", (columns) => {
      const row: string[] = [];
      columns.forEach((column) => {
        row.push(column.value);
      });
      res.push(row);
    });
    request.on("requestCompleted", () => {
      resolve(res);
    });
    request.on("error", () => {
      console.error("SQL execQuery failed");
      reject(res);
    });
    connection.execSql(request);
  });
}

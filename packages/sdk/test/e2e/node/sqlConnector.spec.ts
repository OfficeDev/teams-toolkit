// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import axios from "axios";
import { assert, use as chaiUse } from "chai";
import { SqlManagementClient } from "@azure/arm-sql";
import * as chaiPromises from "chai-as-promised";
import { Connection, Request } from "tedious";
import { getTediousConnectionConfig, TeamsFx } from "../../../src";
import {
  extractIntegrationEnvVariables,
  MockEnvironmentVariable,
  RestoreEnvironmentVariable,
} from "../helper";

chaiUse(chaiPromises);
extractIntegrationEnvVariables();
let restore: () => void;

describe("DefaultTediousConnection Tests - Node", () => {
  let connection: Connection;
  // let sqlManagerClient: SqlManagementClient;
  // let resourceGroup: string | undefined;
  // let sqlName: string | undefined;
  // let subscriptionId: string | undefined;
  before(async () => {
    restore = MockEnvironmentVariable();
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
  it("execQuery should success with username and password", async function () {
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

async function getSQLConnection(): Promise<Connection> {
  const teamsfx = new TeamsFx();
  const config = await getTediousConnectionConfig(teamsfx);
  const connection = new Connection(config);
  return new Promise((resolve, reject) => {
    connection.on("connect", (error) => {
      if (error) {
        console.log(error);
        reject(connection);
      }
      resolve(connection);
    });
    connection.connect((err: any) => {
      if (err) {
        reject(err);
      }
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

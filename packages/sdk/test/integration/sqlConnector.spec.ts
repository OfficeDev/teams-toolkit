// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { Connection, Request } from "tedious";
import { loadConfiguration, DefaultTediousConnectionConfiguration } from "../../src";

chaiUse(chaiPromises);

describe("SQL Connector Test", () => {
  let connection: Connection;
  before(async () => {
    loadConfiguration();
    connection = await getSQLConnection();
  });
  after(async () => {
    if (connection) {
      connection.close();
    }
  });
  it("Test SQL local connect success", async function() {
    const query = "select system_user as u, sysdatetime() as t";
    const result = await execQuery(query, connection);
    const userName = process.env.SQL_USER_NAME;
    assert.isNotNull(result);
    assert.isArray(result);
    assert.strictEqual(result![0]![0], userName);
  });
});

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

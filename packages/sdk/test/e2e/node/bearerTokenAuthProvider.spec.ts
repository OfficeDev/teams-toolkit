// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import { BearerTokenAuthProvider, createApiClient } from "../../../src";
import * as http from "http";
const escape = require("escape-html");

describe("BearerTokenAuthProvider Tests - Node", () => {
  const host = "localhost";
  const port = 53001;
  const apiBaseUrl = `http://${host}:${port}`;
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    const data: { requestHeader: { [key: string]: string }; url: string } = {
      requestHeader: {},
      url: req.url!,
    };
    for (const [key, value] of Object.entries(req.headers)) {
      data.requestHeader[key] = escape(value);
    }
    res.end(JSON.stringify(data));
  });

  before(() => {
    server.listen(port, host, () => {
      console.log(`Server is running on http://${host}:${port}`);
    });
  });

  after(() => {
    server.close(() => {
      console.log(`Server closed`);
    });
  });

  it("can connect to existing API using bearer token auth provider", async function () {
    // Arrange
    const bearerTokenAuthProvider = new BearerTokenAuthProvider(async () => "test-bearer-token");
    const apiClient = createApiClient(apiBaseUrl, bearerTokenAuthProvider);

    // Act
    const res = await apiClient.get("/foo");

    // Assert
    assert.equal(res.data.url, "/foo");
    assert.equal(res.data.requestHeader!["authorization"], "Bearer test-bearer-token");
  });
});

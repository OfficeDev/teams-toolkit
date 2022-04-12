// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import { BasicAuthProvider, BearerTokenAuthProvider, createApiClient } from "../../../src";
import * as http from "http";

describe("ApiClient Tests - Node", () => {
  const host = "localhost";
  const port = 53001;
  const apiBaseUrl = `http://${host}:${port}`;
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    const data = {
      requestHeader: req.headers,
      url: req.url,
    };
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

  it("can connect to existing API using basic auth provider", async function () {
    // Arrange
    const username = "test-username";
    const password = "test-password";
    const basicAuthProvider = new BasicAuthProvider(username, password);
    const apiClient = createApiClient(apiBaseUrl, basicAuthProvider);

    // Act
    const res = await apiClient.get("/foo");

    // Assert
    assert.equal(res.data.url, "/foo");
    const header = res.data.requestHeader!["authorization"] as string;
    assert.isTrue(header.startsWith("Basic "));
    const token = header.split(/\s+/).pop() || "";
    const auth = Buffer.from(token, "base64").toString();
    const parts = auth.split(/:/);
    const serverUsername = parts.shift();
    const serverPassword = parts.join(":");
    assert.equal(serverUsername, username);
    assert.equal(serverPassword, password);
  });
});

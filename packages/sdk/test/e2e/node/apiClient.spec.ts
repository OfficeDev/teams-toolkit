// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import { BearerTokenAuthProvider, createApiClient } from "../../../src";
import * as http from "http";

describe("ApiClient Tests - Node", () => {
  const host = "localhost";
  const port = 53001;
  const apiBaseUrl = `http://${host}:${port}`;
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Successfully create http server for ApiClient E2E test.");
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
    assert.equal(res.config.baseURL, apiBaseUrl);
    assert.equal(res.config.url, "/foo");
    assert.equal(res.config.headers!["Authorization"], "Bearer test-bearer-token");
  });
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import { ApiKeyLocation, ApiKeyProvider, createApiClient } from "../../../src";
import * as http from "http";
import { formatString } from "../../../src/util/utils";
import { ErrorMessage, ErrorCode, ErrorWithCode } from "../../../src/core/errors";
const escape = require("escape-html");
chaiUse(chaiPromises);

describe("ApiKeyProvider Tests - Node", () => {
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

  it("can connect to existing API with api key in header", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.Header);
    const apiClient = createApiClient(apiBaseUrl, apiKeyProvider);

    // Act
    const res = await apiClient.get("/foo");

    // Assert
    assert.equal(res.data.url, "/foo");
    assert.equal(res.data.requestHeader![keyName], keyVaule);
  });

  it("can connect to existing API with api key in query parameter", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.QueryParams);
    const apiClient = createApiClient(apiBaseUrl, apiKeyProvider);

    // Act
    const res = await apiClient.get("/foo");

    // Assert
    assert.equal(res.data.url, "/foo?x-api-key=mock-api-key-vaule");
  });

  it("can connect to existing API with special character in api key in query parameter", async function () {
    // Arrange
    const keyName = "x&api&key";
    const keyVaule = "mock&api&key&vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.QueryParams);
    const apiClient = createApiClient(apiBaseUrl, apiKeyProvider);

    // Act
    const res = await apiClient.get("/foo");

    // Assert
    assert.equal(res.data.url, "/foo?x%26api%26key=mock%26api%26key%26vaule");
  });

  it("can connect to existing API with special character in api key in header", async function () {
    // Arrange
    const keyName = "x&api&key";
    const keyVaule = "mock&api&key&vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.Header);
    const apiClient = createApiClient(apiBaseUrl, apiKeyProvider);

    // Act
    const res = await apiClient.get("/foo");

    // Assert
    assert.equal(res.data.url, "/foo");
    assert.equal(res.data.requestHeader![keyName], escape(keyVaule));
  });

  it("should throw error when connect to existing API with duplicate api key in header", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.Header);
    const apiClient = createApiClient(apiBaseUrl, apiKeyProvider);

    // Act
    const errorResult = await expect(
      apiClient.get("/foo", {
        headers: {
          "x-api-key": "preset-api-key-value",
        },
      })
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    // Assert
    assert.equal(errorResult.code, ErrorCode.AuthorizationInfoAlreadyExists);
    assert.equal(errorResult.message, formatString(ErrorMessage.DuplicateApiKeyInHeader, keyName));
  });

  it("should throw error when connect to existing API with duplicate api key in parameter", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.QueryParams);
    const apiClient = createApiClient(apiBaseUrl, apiKeyProvider);

    // Act
    const errorResult = await expect(
      apiClient.get("/foo", {
        params: {
          "x-api-key": "preset-api-key-value",
        },
      })
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    // Assert
    assert.equal(errorResult.code, ErrorCode.AuthorizationInfoAlreadyExists);
    assert.equal(
      errorResult.message,
      formatString(ErrorMessage.DuplicateApiKeyInQueryParam, keyName)
    );
  });

  it("should throw error when connect to existing API with duplicate api key in parameter", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.QueryParams);
    const apiClient = createApiClient(apiBaseUrl, apiKeyProvider);

    // Act
    const errorResult = await expect(
      apiClient.get("/foo?x-api-key=preset-api-key-vaule")
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    // Assert
    assert.equal(errorResult.code, ErrorCode.AuthorizationInfoAlreadyExists);
    assert.equal(
      errorResult.message,
      formatString(ErrorMessage.DuplicateApiKeyInQueryParam, keyName)
    );
  });
});

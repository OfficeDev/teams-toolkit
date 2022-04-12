// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import { ApiKeyProvider, ApiKeyLocation } from "../../../src";
import * as chaiPromises from "chai-as-promised";
import { ErrorMessage, ErrorCode, ErrorWithCode } from "../../../src/core/errors";
import { formatString } from "../../../src/util/utils";

chaiUse(chaiPromises);

describe("ApiKeyProvider Tests - Node", () => {
  it("AddAuthenticationInfo can add api key in axios request header", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.Header);

    // Act
    const updatedConfig = await apiKeyProvider.AddAuthenticationInfo({});

    // Assert
    assert.equal(updatedConfig.headers![keyName], keyVaule);
  });

  it("AddAuthenticationInfo can add api key in axios request query parameter", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.QueryParams);

    // Act
    const updatedConfig = await apiKeyProvider.AddAuthenticationInfo({
      url: "https://mock.api.com",
    });

    // Assert
    assert.equal(updatedConfig.url, "https://mock.api.com/?x-api-key=mock-api-key-vaule");
  });

  it("AddAuthenticationInfo should throw error if api key already exists in request header", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.Header);

    // Act
    const errorResult = await expect(
      apiKeyProvider.AddAuthenticationInfo({
        headers: {
          "x-api-key": "preset-api-key-value",
        },
      })
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    // Assert
    assert.equal(errorResult.code, ErrorCode.AuthorizationInfoAlreadyExists);
    assert.equal(errorResult.message, formatString(ErrorMessage.DuplicateApiKeyInHeader, keyName));
  });

  it("AddAuthenticationInfo should throw error if api key already exists in request query parameter", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.QueryParams);

    // Act
    const errorResult = await expect(
      apiKeyProvider.AddAuthenticationInfo({
        url: "https://mock.api.com/?x-api-key=preset-api-key-vaule",
      })
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    // Assert
    assert.equal(errorResult.code, ErrorCode.AuthorizationInfoAlreadyExists);
    assert.equal(
      errorResult.message,
      formatString(ErrorMessage.DuplicateApiKeyInQueryParam, keyName)
    );
  });

  it("AddAuthenticationInfo can add api key in request query parameter with special characters", async function () {
    // Arrange
    const keyName = "x&api&key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.QueryParams);

    // Act
    const updatedConfig = await apiKeyProvider.AddAuthenticationInfo({
      url: "https://mock.api.com",
    });

    // Assert
    assert.equal(updatedConfig.url, "https://mock.api.com/?x%26api%26key=mock-api-key-vaule");
  });

  it("Initialize ApiKeyProvider should throw error if keyName or keyVaule is empty", async function () {
    // Test when keyName is empty
    expect(() => {
      new ApiKeyProvider("", "test-key-vaule", ApiKeyLocation.Header);
    })
      .to.throw(ErrorWithCode, "Parameter keyName is empty")
      .with.property("code", ErrorCode.InvalidParameter);

    expect(() => {
      new ApiKeyProvider("", "test-key-vaule", ApiKeyLocation.QueryParams);
    })
      .to.throw(ErrorWithCode, "Parameter keyName is empty")
      .with.property("code", ErrorCode.InvalidParameter);

    // Test when keyVaule is empty
    expect(() => {
      new ApiKeyProvider("test-key-name", "", ApiKeyLocation.Header);
    })
      .to.throw(ErrorWithCode, "Parameter keyVaule is empty")
      .with.property("code", ErrorCode.InvalidParameter);

    expect(() => {
      new ApiKeyProvider("test-key-name", "", ApiKeyLocation.QueryParams);
    })
      .to.throw(ErrorWithCode, "Parameter keyVaule is empty")
      .with.property("code", ErrorCode.InvalidParameter);
  });
});

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
      baseURL: "http://fake-base-url",
      url: "/foo",
    });

    // Assert
    assert.equal(updatedConfig.params[keyName], keyVaule);
  });

  it("AddAuthenticationInfo can add api key in axios request query parameter when url in configuration is undefined", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.QueryParams);

    // Act
    const updatedConfig = await apiKeyProvider.AddAuthenticationInfo({
      baseURL: "http://fake-base-url",
    });

    // Assert
    assert.equal(updatedConfig.params[keyName], keyVaule);
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

  it("AddAuthenticationInfo should throw error if api key already defined in request config param as query parameter", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.QueryParams);

    // Act
    const errorResult = await expect(
      apiKeyProvider.AddAuthenticationInfo({
        baseURL: "http://fake-base-url",
        url: "/foo",
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

  it("AddAuthenticationInfo should throw error if api key already defined in request url as query parameter", async function () {
    // Arrange
    const keyName = "x-api-key";
    const keyVaule = "mock-api-key-vaule";
    const apiKeyProvider = new ApiKeyProvider(keyName, keyVaule, ApiKeyLocation.QueryParams);

    // Act
    const errorResult = await expect(
      apiKeyProvider.AddAuthenticationInfo({
        baseURL: "http://fake-base-url",
        url: "/foo?x-api-key=preset-api-key-value",
      })
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    // Assert
    assert.equal(errorResult.code, ErrorCode.AuthorizationInfoAlreadyExists);
    assert.equal(
      errorResult.message,
      formatString(ErrorMessage.DuplicateApiKeyInQueryParam, keyName)
    );
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

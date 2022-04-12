// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import { BasicAuthProvider } from "../../../src";
import * as chaiPromises from "chai-as-promised";
import { ErrorMessage, ErrorCode, ErrorWithCode } from "../../../src/core/errors";

chaiUse(chaiPromises);

describe("BasicAuthProvider Tests - Node", () => {
  it("AddAuthenticationInfo should add basic token in axios configuration", async function () {
    // Arrange
    const username = "test-username";
    const password = "test-password";
    const basicAuthProvider = new BasicAuthProvider(username, password);

    // Act
    const updatedConfig = await basicAuthProvider.AddAuthenticationInfo({});

    // Assert
    assert.equal(updatedConfig.auth?.username, username);
    assert.equal(updatedConfig.auth?.password, password);
  });

  it("AddAuthenticationInfo should throw error if axios basic credential already exists", async function () {
    // Arrange
    const username = "test-username";
    const password = "test-password";
    const basicAuthProvider = new BasicAuthProvider(username, password);

    // Act
    const errorResult = await expect(
      basicAuthProvider.AddAuthenticationInfo({
        auth: {
          username: "preset-username",
          password: "preset-password",
        },
      })
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    // Assert
    assert.equal(errorResult.code, ErrorCode.AuthorizationInfoAlreadyExists);
    assert.equal(errorResult.message, ErrorMessage.BasicCredentialAlreadyExists);
  });

  it("AddAuthenticationInfo should throw error if axios header Authorization already exists", async function () {
    // Arrange
    const username = "test-username";
    const password = "test-password";
    const basicAuthProvider = new BasicAuthProvider(username, password);

    // Act
    const errorResult = await expect(
      basicAuthProvider.AddAuthenticationInfo({
        headers: {
          Authorization: "preset-token",
        },
      })
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    // Assert
    assert.equal(errorResult.code, ErrorCode.AuthorizationInfoAlreadyExists);
    assert.equal(errorResult.message, ErrorMessage.AuthorizationHeaderAlreadyExists);
  });

  it("Initialize BasicAuthProvider should throw error if username or password is empty", async function () {
    // Test when username is empty
    expect(() => {
      new BasicAuthProvider("", "test-password");
    })
      .to.throw(ErrorWithCode, "Parameter username is empty")
      .with.property("code", ErrorCode.InvalidParameter);

    // Test when password is empty
    expect(() => {
      new BasicAuthProvider("test-username", "");
    })
      .to.throw(ErrorWithCode, "Parameter password is empty")
      .with.property("code", ErrorCode.InvalidParameter);
  });
});

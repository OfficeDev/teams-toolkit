// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import { BearerTokenAuthProvider } from "../../../src";
import * as chaiPromises from "chai-as-promised";
import { ErrorMessage, ErrorCode, ErrorWithCode } from "../../../src/core/errors";

chaiUse(chaiPromises);

describe("BearerTokenAuthProvider Tests - Node", () => {
  it("AddAuthenticationInfo should add bearer token in axios header Authorization", async function () {
    // Arrange
    const bearerTokenAuthProvider = new BearerTokenAuthProvider(async () => "fake-token");

    // Act
    const updatedConfig = await bearerTokenAuthProvider.AddAuthenticationInfo({});

    // Assert
    assert.equal(updatedConfig.headers!["Authorization"], "Bearer fake-token");
  });

  it("AddAuthenticationInfo should throw error if axios header Authorization already exists", async function () {
    // Arrange
    const bearerTokenAuthProvider = new BearerTokenAuthProvider(async () => "fake-token");

    // Act
    const errorResult = await expect(
      bearerTokenAuthProvider.AddAuthenticationInfo({
        headers: {
          Authorization: "preset-token",
        },
      })
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    // Assert
    assert.equal(errorResult.code, ErrorCode.AuthorizationInfoAlreadyExists);
    assert.equal(errorResult.message, ErrorMessage.AuthorizationHeaderAlreadyExists);
  });
});

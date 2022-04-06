// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import { BasicAuthProvider } from "../../../src";
import * as chaiPromises from "chai-as-promised";

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
    ).to.eventually.be.rejectedWith(Error);

    // Assert
    assert.equal(errorResult.message, "Basic credential already exists!");
  });
});

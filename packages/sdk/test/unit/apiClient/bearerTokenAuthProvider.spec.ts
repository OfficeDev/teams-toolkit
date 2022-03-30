// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import axios from "axios";
import { BearerTokenAuthProvider, createApiClient } from "../../../src";
import MockAdapter from "axios-mock-adapter";
import * as chaiPromises from "chai-as-promised";

chaiUse(chaiPromises);

describe("BearerTokenAuthProvider Tests - Node", () => {
  const apiBaseUrl = "https://fake-api-endpoint";

  it("AddAuthenticationInfo should add bearer token in axios header Authorization", async function () {
    // Arrange
    const bearerTokenAuthProvider = new BearerTokenAuthProvider(async () => "fake-token");
    const axiosMockAdapter = new MockAdapter(axios);
    axiosMockAdapter.onGet("/foo").replyOnce(200);

    // Act
    const apiClient = createApiClient(apiBaseUrl, bearerTokenAuthProvider);
    const res = await apiClient.get("/foo");

    // Assert
    assert.equal(res.config.headers!["Authorization"], "Bearer fake-token");
  });

  it("AddAuthenticationInfo should throw error if axios header Authorization already exists", async function () {
    // Arrange
    const bearerTokenAuthProvider = new BearerTokenAuthProvider(async () => "fake-token");
    const axiosMockAdapter = new MockAdapter(axios);
    axiosMockAdapter.onGet("/foo").replyOnce(200);

    // Act
    const apiClient = createApiClient(apiBaseUrl, bearerTokenAuthProvider);

    // Assert
    const errorResult = await expect(
      apiClient.get("/foo", {
        headers: {
          Authorization: "preset-token",
        },
      })
    ).to.eventually.be.rejectedWith(Error);
    assert.equal(errorResult.message, "Authorization configuration already exists in header!");
  });
});

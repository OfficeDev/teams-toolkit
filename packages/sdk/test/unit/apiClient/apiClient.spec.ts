// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import { MockAuthProvider } from "./mockAuthProvider";
import { createApiClient } from "../../../src";
import MockAdapter from "axios-mock-adapter";

describe("ApiClient Tests - Node", () => {
  it("createApiClient should return axios instance with base url and config updated", async function () {
    // Arrange
    const apiBaseUrl = "https://fake-api-endpoint";
    const mockAuthProvider = new MockAuthProvider();

    // Act
    const apiClient = createApiClient(apiBaseUrl, mockAuthProvider);
    const axiosMockAdapter = new MockAdapter(apiClient);
    axiosMockAdapter.onGet("/foo").replyOnce(200);
    const res = await apiClient.get("/foo");

    // Assert
    assert.equal(res.config.baseURL, apiBaseUrl);
    assert.equal(res.config.url, "/foo");
    assert.equal(res.config.headers!["Authorization"], "fake-token");
  });
});

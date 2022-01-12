// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, use as chaiUse, expect } from "chai";
import * as chaiPromises from "chai-as-promised";
import {
  getApiConfigFromEnv,
  getAuthenticationConfigFromEnv,
  getSqlConfigFromEnv,
} from "../../../src/core/configurationProvider.browser";
import { ErrorWithCode, ErrorCode } from "../../../src/index.browser";
import {
  MockBrowserEnvironment,
  RestoreBrowserEnvironment,
  authorityHost,
  tenantId,
  clientId,
  simpleAuthEndpoint,
  initiateLoginEndpoint,
  applicationIdUri,
} from "../helper.browser";

chaiUse(chaiPromises);

describe("ConfigurationProvider Tests - Browser", () => {
  beforeEach(function () {
    MockBrowserEnvironment();
  });

  afterEach(function () {
    RestoreBrowserEnvironment();
  });

  it("getAuthenticationConfigFromEnv should return config set with env variables", () => {
    const authConfig = getAuthenticationConfigFromEnv();

    assert.strictEqual(authConfig.authorityHost, authorityHost);
    assert.strictEqual(authConfig.tenantId, tenantId);
    assert.strictEqual(authConfig.clientId, clientId);
    assert.strictEqual(authConfig.simpleAuthEndpoint, simpleAuthEndpoint);
    assert.strictEqual(authConfig.initiateLoginEndpoint, initiateLoginEndpoint);
    assert.strictEqual(authConfig.applicationIdUri, applicationIdUri);
  });

  it("getApiConfigFromEnv should throw error", () => {
    expect(() => {
      getApiConfigFromEnv();
    })
      .to.throw(ErrorWithCode, "getApiConfigFromEnv is not supported in browser.")
      .with.property("code", ErrorCode.RuntimeNotSupported);
  });

  it("getSqlConfigFromEnv should throw error", () => {
    expect(() => {
      getSqlConfigFromEnv();
    })
      .to.throw(ErrorWithCode, "getSqlConfigFromEnv is not supported in browser.")
      .with.property("code", ErrorCode.RuntimeNotSupported);
  });
});

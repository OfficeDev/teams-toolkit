// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, use as chaiUse, expect } from "chai";
import mockedEnv from "mocked-env";
import * as chaiPromises from "chai-as-promised";
import {
  getApiConfigFromEnv,
  getAuthenticationConfigFromEnv,
  getSqlConfigFromEnv,
} from "../../../src/core/configurationProvider";
import { ErrorWithCode, ErrorCode } from "../../../src/index.browser";

chaiUse(chaiPromises);

describe("ConfigurationProvider Tests - Browser", () => {
  const clientId = "fake_client_id";
  const tenantId = "fake_tenant_id";
  const authorityHost = "https://fake_authority_host";
  const simpleAuthEndpoint = "https://fake_simple_auth";
  const initiateLoginEndpoint = "https://fake_login_endpoint";
  const applicationIdUri = "fake_application_id";

  let mockedEnvRestore: () => void;

  beforeEach(function () {
    mockedEnvRestore = mockedEnv({
      // Authentication
      REACT_APP_AUTHORITY_HOST: authorityHost,
      REACT_APP_TENANT_ID: tenantId,
      REACT_APP_CLIENT_ID: clientId,
      REACT_APP_TEAMSFX_ENDPOINT: simpleAuthEndpoint,
      REACT_APP_START_LOGIN_PAGE_URL: initiateLoginEndpoint,
      M365_APPLICATION_ID_URI: applicationIdUri,
    });
  });

  afterEach(function () {
    mockedEnvRestore();
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

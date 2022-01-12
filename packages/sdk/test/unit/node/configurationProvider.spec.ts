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

chaiUse(chaiPromises);

describe("ConfigurationProvider Tests - Node", () => {
  const fakeSQLEndpoint = "xxx.database.windows.net";
  const fakeSQLUserName = "fake_name";
  const fakeSQLPassword = "fake_password";
  const fakeSQLDataName = "fake_data_name";
  const fakeIdentityId = "fake_identity_id";
  const fakeAPIEndpoint = "xxx.function.windows.net";

  const clientId = "fake_client_id";
  const tenantId = "fake_tenant_id";
  const clientSecret = "fake_client_secret";
  const authorityHost = "https://fake_authority_host";
  const simpleAuthEndpoint = "https://fake_simple_auth";
  const initiateLoginEndpoint = "https://fake_login_endpoint";
  const applicationIdUri = "fake_application_id";

  let mockedEnvRestore: () => void;

  beforeEach(function () {
    mockedEnvRestore = mockedEnv({
      // Authentication
      M365_CLIENT_ID: clientId,
      M365_CLIENT_SECRET: clientSecret,
      M365_TENANT_ID: tenantId,
      M365_AUTHORITY_HOST: authorityHost,
      SIMPLE_AUTH_ENDPOINT: simpleAuthEndpoint,
      INITIATE_LOGIN_ENDPOINT: initiateLoginEndpoint,
      M365_APPLICATION_ID_URI: applicationIdUri,
      // API
      API_ENDPOINT: fakeAPIEndpoint,
      // SQL
      SQL_ENDPOINT: fakeSQLEndpoint,
      SQL_USER_NAME: fakeSQLUserName,
      SQL_PASSWORD: fakeSQLPassword,
      SQL_DATABASE_NAME: fakeSQLDataName,
      IDENTITY_ID: fakeIdentityId,
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
    assert.strictEqual(authConfig.clientSecret, clientSecret);
    assert.strictEqual(authConfig.simpleAuthEndpoint, simpleAuthEndpoint);
    assert.strictEqual(authConfig.initiateLoginEndpoint, initiateLoginEndpoint);
    assert.strictEqual(authConfig.applicationIdUri, applicationIdUri);
  });

  it("getApiConfigFromEnv should return config set with env variables", () => {
    const apiConfig = getApiConfigFromEnv();

    assert.strictEqual(apiConfig.endpoint, fakeAPIEndpoint);
  });

  it("getSqlConfigFromEnv should return config set with env variables", () => {
    const sqlConfig = getSqlConfigFromEnv();

    assert.strictEqual(sqlConfig.sqlServerEndpoint, fakeSQLEndpoint);
    assert.strictEqual(sqlConfig.sqlUsername, fakeSQLUserName);
    assert.strictEqual(sqlConfig.sqlPassword, fakeSQLPassword);
    assert.strictEqual(sqlConfig.sqlDatabaseName, fakeSQLDataName);
    assert.strictEqual(sqlConfig.sqlIdentityId, fakeIdentityId);
  });
});

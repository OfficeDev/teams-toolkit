// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, use as chaiUse, expect } from "chai";
import chaiPromises from "chai-as-promised";
import {
  loadConfiguration,
  ResourceType,
  ErrorWithCode,
  ErrorCode,
  getResourceConfiguration,
  getAuthenticationConfiguration
} from "../../../src";

chaiUse(chaiPromises);

describe("ConfigurationProvider Tests - Node", () => {
  const fakeSQLEndpoint = "xxx.database.windows.net";
  const fakeSQLUserName = "fake_name";
  const fakeSQLPassword = "fake_password";
  const fakeSQLDataName = "fake_data_name";
  const fakeAPIEndpoint = "xxx.function.windows.net";

  const clientId = "fake_client_id";
  const overrideClientId = "override_client_id";
  const tenantId = "fake_tenant_id";
  const clientSecret = "fake_client_secret";
  const authorityHost = "https://fake_authority_host";

  it("getResourceConfiguration should success with valid config", () => {
    loadConfiguration({
      authentication: {},
      resources: [
        {
          type: ResourceType.API,
          name: "default",
          properties: {
            functionEndpoint: fakeAPIEndpoint
          }
        },
        {
          type: ResourceType.SQL,
          name: "default",
          properties: {
            sqlServerEndpoint: fakeSQLEndpoint,
            sqlUsername: fakeSQLUserName,
            sqlPassword: fakeSQLPassword,
            sqlDatabaseName: fakeSQLDataName
          }
        }
      ]
    });

    const result = getResourceConfiguration(ResourceType.SQL);
    assert.isNotNull(result);
    assert.strictEqual(result!.sqlServerEndpoint, fakeSQLEndpoint);
    assert.strictEqual(result!.sqlUsername, fakeSQLUserName);
    assert.strictEqual(result!.sqlPassword, fakeSQLPassword);
    assert.strictEqual(result!.sqlDatabaseName, fakeSQLDataName);
  });

  it("getResourceConfiguration should throw InvalidConfiguration error with incorrect type", () => {
    loadConfiguration({
      authentication: {},
      resources: [
        {
          type: ResourceType.SQL,
          name: "default",
          properties: {
            sqlServerEndpoint: fakeSQLEndpoint,
            sqlUsername: fakeSQLUserName,
            sqlPassword: fakeSQLPassword,
            sqlDatabaseName: fakeSQLDataName
          }
        }
      ]
    });
    try {
      getResourceConfiguration(ResourceType.API);
    } catch (err) {
      expect(err).to.be.instanceOf(ErrorWithCode);
      expect(err.code).to.eql(ErrorCode.InvalidConfiguration);
    }
  });

  it("getResourceConfiguration should throw InvalidConfiguration error without name exist", () => {
    loadConfiguration({
      authentication: {},
      resources: [
        {
          type: ResourceType.SQL,
          name: "default",
          properties: {
            sqlServerEndpoint: fakeSQLEndpoint,
            sqlUsername: fakeSQLUserName,
            sqlPassword: fakeSQLPassword,
            sqlDatabaseName: fakeSQLDataName
          }
        }
      ]
    });
    try {
      getResourceConfiguration(ResourceType.SQL, "API-1");
    } catch (err) {
      expect(err).to.be.instanceOf(ErrorWithCode);
      expect(err.code).to.eql(ErrorCode.InvalidConfiguration);
    }
  });

  it("getResourceConfiguration should success with valid environment variables", () => {
    process.env.M365_CLIENT_ID = clientId;
    process.env.M365_TENANT_ID = tenantId;
    process.env.M365_CLIENT_SECRET = clientSecret;
    process.env.M365_AUTHORITY_HOST = authorityHost;

    loadConfiguration();

    const authConfig = getAuthenticationConfiguration();

    assert.isNotNull(authConfig);
    if (authConfig) {
      assert.strictEqual(authConfig.clientId, clientId);
      assert.strictEqual(authConfig.tenantId, tenantId);
      assert.strictEqual(authConfig.clientSecret, clientSecret);
      assert.strictEqual(authConfig.authorityHost, authorityHost);
    }
  });

  it("getResourceConfiguration should override environment variables with local config object", () => {
    process.env.M365_CLIENT_ID = clientId;
    process.env.M365_TENANT_ID = tenantId;
    process.env.M365_CLIENT_SECRET = clientSecret;
    process.env.M365_AUTHORITY_HOST = authorityHost;

    loadConfiguration({
      authentication: {
        clientId: overrideClientId
      }
    });

    const authConfig = getAuthenticationConfiguration();

    assert.isNotNull(authConfig);
    if (authConfig) {
      assert.strictEqual(authConfig.clientId, overrideClientId);
      assert.strictEqual(authConfig.tenantId, undefined);
      assert.strictEqual(authConfig.clientSecret, undefined);
      assert.strictEqual(authConfig.authorityHost, undefined);
    }
  });

  it("getResourceConfiguration should get undefined result when there is no environment variable", () => {
    delete process.env.M365_CLIENT_ID;
    delete process.env.M365_TENANT_ID;
    delete process.env.M365_CLIENT_SECRET;
    delete process.env.M365_AUTHORITY_HOST;
    loadConfiguration();
    const authConfig = getAuthenticationConfiguration();
    if (authConfig) {
      assert.strictEqual(authConfig.clientId, undefined);
      assert.strictEqual(authConfig.tenantId, undefined);
      assert.strictEqual(authConfig.clientSecret, undefined);
      assert.strictEqual(authConfig.authorityHost, undefined);
    }
  });
});

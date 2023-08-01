// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, ManagedIdentityCredential } from "@azure/identity";
import { assert, use as chaiUse, expect } from "chai";
import * as chaiPromises from "chai-as-promised";
import * as sinon from "sinon";
import mockedEnv from "mocked-env";
import {
  getTediousConnectionConfig,
  ErrorWithCode,
  setLogLevel,
  LogLevel,
  TeamsFx,
} from "../../../../src";

chaiUse(chaiPromises);
let restore: () => void;

describe("DefaultTediousConnection Tests - Node", () => {
  // fake configuration for sql.
  const fakeSQLServerEndpoint = "xxx.database.windows.net";
  const fakeSQLUserName = "fake_name";
  const fakeSQLPassword = "fake_password";
  const fakeSQLIdentityId = "fake_identity_id";
  const fakeSQLDataName = "fake_data_name";
  const fakeToken = "fake_token";
  const defaultAuthenticationType = "default";
  const tokenAuthenticationType = "azure-active-directory-access-token";

  // error code.
  const INVALID_CONFIGURATION = "InvalidConfiguration";

  before(() => {
    setLogLevel(LogLevel.Verbose);
  });
  after(() => {
    setLogLevel(LogLevel.Info);
  });
  afterEach(function () {
    restore();
    sinon.restore();
  });

  it("getConfig should success with username and password", async function () {
    restore = mockedEnv({
      SQL_ENDPOINT: fakeSQLServerEndpoint,
      SQL_DATABASE_NAME: fakeSQLDataName,
      SQL_USER_NAME: fakeSQLUserName,
      SQL_PASSWORD: fakeSQLPassword,
    });

    const teamsfx = new TeamsFx();
    const tediousConnectConfig = await getTediousConnectionConfig(teamsfx);

    assert.isNotNull(tediousConnectConfig);
    assert.isNotNull(tediousConnectConfig.authentication);
    assert.strictEqual(tediousConnectConfig.authentication!.type, defaultAuthenticationType);
    assert.strictEqual(tediousConnectConfig.server, fakeSQLServerEndpoint);
    assert.strictEqual(tediousConnectConfig.authentication!.options.userName, fakeSQLUserName);
    assert.strictEqual(tediousConnectConfig.authentication!.options.password, fakeSQLPassword);
    assert.strictEqual(tediousConnectConfig.options?.database, fakeSQLDataName);
  });

  it("getConfig should success with access token", async function () {
    restore = mockedEnv({
      SQL_ENDPOINT: fakeSQLServerEndpoint,
      SQL_DATABASE: fakeSQLDataName,
      IDENTITY_ID: fakeSQLIdentityId,
    });

    const identityManager_GetToken = sinon.stub(ManagedIdentityCredential.prototype, "getToken");
    identityManager_GetToken.callsFake(async () => {
      return new Promise<AccessToken>((resolve) => {
        resolve({
          token: "fake_token",
          expiresOnTimestamp: 12345678,
        });
      });
    });

    const teamsfx = new TeamsFx();
    const tediousConnectConfig = await getTediousConnectionConfig(teamsfx);

    assert.isNotNull(tediousConnectConfig);
    assert.isNotNull(tediousConnectConfig.authentication);
    assert.strictEqual(tediousConnectConfig.authentication!.type, tokenAuthenticationType);
    assert.strictEqual(tediousConnectConfig.server, fakeSQLServerEndpoint);
    assert.strictEqual(tediousConnectConfig.authentication!.options.token, fakeToken);

    sinon.restore();
  });

  it("getConfig should success with specified database name", async function () {
    restore = mockedEnv({
      SQL_ENDPOINT: fakeSQLServerEndpoint,
      SQL_USER_NAME: fakeSQLUserName,
      SQL_PASSWORD: fakeSQLPassword,
    });

    const anotherSqlDatabaseName = "another database";
    const teamsfx = new TeamsFx();
    const tediousConnectConfig = await getTediousConnectionConfig(teamsfx, anotherSqlDatabaseName);

    assert.isNotNull(tediousConnectConfig);
    assert.strictEqual(tediousConnectConfig.options?.database, anotherSqlDatabaseName);
  });

  it("getConfig should warn with empty database name", async function () {
    restore = mockedEnv({
      SQL_ENDPOINT: fakeSQLServerEndpoint,
      SQL_USER_NAME: fakeSQLUserName,
      SQL_PASSWORD: fakeSQLPassword,
    });

    const teamsfx = new TeamsFx();
    const tediousConnectConfig = await getTediousConnectionConfig(teamsfx, "");

    assert.isNotNull(tediousConnectConfig);
    assert.strictEqual(tediousConnectConfig.options?.database, "");
  });

  it("getConfig should throw InvalidConfiguration error without host name", async function () {
    restore = mockedEnv({
      SQL_DATABASE: fakeSQLDataName,
      SQL_USER_NAME: fakeSQLUserName,
      SQL_PASSWORD: fakeSQLPassword,
    });

    const teamsfx = new TeamsFx();
    await expect(getTediousConnectionConfig(teamsfx))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", INVALID_CONFIGURATION);
  });

  it("getConfig should throw InvalidConfiguration error without username, password or identity id", async function () {
    restore = mockedEnv({
      SQL_ENDPOINT: fakeSQLServerEndpoint,
      SQL_DATABASE: fakeSQLDataName,
    });

    const teamsfx = new TeamsFx();
    await expect(getTediousConnectionConfig(teamsfx))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", INVALID_CONFIGURATION);
  });
});

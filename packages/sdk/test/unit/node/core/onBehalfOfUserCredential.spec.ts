// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { ErrorWithCode, loadConfiguration, OnBehalfOfUserCredential } from "../../../../src";
import sinon from "sinon";
import mockedEnv from "mocked-env";
import { AuthenticationResult, ConfidentialClientApplication } from "@azure/msal-node";

chaiUse(chaiPromises);
let mockedEnvRestore: () => void;
const jwtBuilder = require("jwt-builder");

describe("OnBehalfOfUserCredential - node", () => {
  const scope = "fake_scope";
  const clientId = "fake_client_id";
  const clientSecret = "fake_client_secret";
  const authorityHost = "fake_authority_host";
  const tenantId = "fake_tenant_id";
  const accessToken = "fake_access_token";
  const accessTokenExpDate = new Date("2021-04-14T02:02:23.742Z");
  const accessTokenExpNumber = accessTokenExpDate.getTime();

  // Error code
  const InvalidConfiguration = "InvalidConfiguration";
  const InternalError = "InternalError";
  const ServiceError = "ServiceError";

  const now = Math.floor(Date.now() / 1000);
  const timeInterval = 4000;
  const ssoTokenExp = now+timeInterval;
  const ssoToken = jwtBuilder({
    algorithm: 'HS256',
    secret: 'super-secret',
    aud: "test_audience",
    iss: "https://login.microsoftonline.com/test_aad_id/v2.0",
    iat: now,
    nbf: now,
    exp: timeInterval,
    aio: "test_aio",
    name: "Teams App Framework SDK Unit Test",
    oid: "11111111-2222-3333-4444-555555555555",
    preferred_username: "test@microsoft.com",
    rh: "test_rh",
    scp: "access_as_user",
    sub: "test_sub",
    tid: "test_tenant_id",
    uti: "test_uti",
    ver: "2.0"
  });

  const sandbox = sinon.createSandbox();

  beforeEach(function() {
    mockedEnvRestore = mockedEnv({
      M365_CLIENT_ID: clientId,
      M365_CLIENT_SECRET: clientSecret,
      M365_AUTHORITY_HOST: authorityHost,
      M365_TENANT_ID: tenantId
    });

    // Mock ConfidentialClientApplication implementation
    sandbox.stub(ConfidentialClientApplication.prototype, "acquireTokenOnBehalfOf").callsFake(
      (): Promise<AuthenticationResult | null> => {
        const authResult: AuthenticationResult = {
          authority: "fake_authority",
          uniqueId: "fake_uniqueId",
          tenantId: "fake_tenant_id",
          scopes: [],
          account: null,
          idToken: "fake_id_token",
          idTokenClaims: new Object(),
          accessToken: accessToken,
          fromCache: false,
          tokenType: "fake_tokenType",
          expiresOn: accessTokenExpDate
        };
        return new Promise<AuthenticationResult>((resolve) => {
          resolve(authResult);
        });
      }
    );
  });

  afterEach(function() {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("construct OnBehalfOfUserCredential should throw InvalidConfiguration Error when clientId not found", async function() {
    mockedEnvRestore = mockedEnv(
      {
        M365_CLIENT_SECRET: clientSecret,
        M365_AUTHORITY_HOST: authorityHost,
        M365_TENANT_ID: tenantId
      },
      { clear: true }
    );
    loadConfiguration();

    expect(() => {
      new OnBehalfOfUserCredential(ssoToken);
    })
      .to.throw(ErrorWithCode, "clientId in configuration is invalid: undefined")
      .with.property("code", InvalidConfiguration);
  });

  it("construct OnBehalfOfUserCredential should throw InvalidConfiguration Error when authorityHost not found", async function() {
    mockedEnvRestore = mockedEnv(
      {
        M365_CLIENT_ID: clientId,
        M365_CLIENT_SECRET: clientSecret,
        M365_TENANT_ID: tenantId
      },
      { clear: true }
    );
    loadConfiguration();

    expect(() => {
      new OnBehalfOfUserCredential(ssoToken);
    })
      .to.throw(ErrorWithCode, "authorityHost in configuration is invalid: undefined")
      .with.property("code", InvalidConfiguration);
  });

  it("construct OnBehalfOfUserCredential should throw InvalidConfiguration Error when clientSecret not found", async function() {
    mockedEnvRestore = mockedEnv(
      {
        M365_CLIENT_ID: clientId,
        M365_AUTHORITY_HOST: authorityHost,
        M365_TENANT_ID: tenantId
      },
      { clear: true }
    );
    loadConfiguration();

    expect(() => {
      new OnBehalfOfUserCredential(ssoToken);
    })
      .to.throw(ErrorWithCode, "clientSecret in configuration is invalid: undefined")
      .with.property("code", InvalidConfiguration);
  });

  it("construct OnBehalfOfUserCredential should throw InvalidConfiguration Error when tenantId not found", async function() {
    mockedEnvRestore = mockedEnv(
      {
        M365_CLIENT_ID: clientId,
        M365_CLIENT_SECRET: clientSecret,
        M365_AUTHORITY_HOST: authorityHost
      },
      { clear: true }
    );
    loadConfiguration();

    expect(() => {
      new OnBehalfOfUserCredential(ssoToken);
    })
      .to.throw(ErrorWithCode, "tenantId in configuration is invalid: undefined")
      .with.property("code", InvalidConfiguration);
  });

  it("construct OnBehalfOfUserCredential should throw InvalidConfiguration Error when clientId, clientSecret, authorityHost, tenantId not found", async function() {
    mockedEnvRestore = mockedEnv({}, { clear: true });
    loadConfiguration();

    expect(() => {
      new OnBehalfOfUserCredential(ssoToken);
    })
      .to.throw(
        ErrorWithCode,
        "clientId, authorityHost, clientSecret, tenantId in configuration is invalid: undefined"
      )
      .with.property("code", InvalidConfiguration);
  });

  it("should get sso token when scopes is empty string", async function() {
    loadConfiguration();
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const token = await oboCredential.getToken("");
    assert.strictEqual(token!.token, ssoToken);
    assert.strictEqual(token!.expiresOnTimestamp, ssoTokenExp);
  });

  it("should get sso token when scopes is empty array", async function() {
    loadConfiguration();
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const token = await oboCredential.getToken([]);
    assert.strictEqual(token!.token, ssoToken);
    assert.strictEqual(token!.expiresOnTimestamp, ssoTokenExp);
  });

  it("should get access token when scopes is string", async function() {
    loadConfiguration();
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const token = await oboCredential.getToken(scope);
    assert.strictEqual(token!.token, accessToken);
    assert.strictEqual(token!.expiresOnTimestamp, accessTokenExpNumber);
  });

  it("should get access token when scopes is string array", async function() {
    loadConfiguration();
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const scopesArray: string[] = [scope, "fake_scope_2"];
    const token = await oboCredential.getToken(scopesArray);
    assert.strictEqual(token!.token, accessToken);
    assert.strictEqual(token!.expiresOnTimestamp, accessTokenExpNumber);
  });

  it("should throw InternalError with invalid SSO token when get sso token", async function() {
    loadConfiguration();
    const invalidSsoToken = "invalid_sso_token";
    const oboCredential = new OnBehalfOfUserCredential(invalidSsoToken);

    await expect(oboCredential.getToken([]))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", InternalError);
    await expect(oboCredential.getToken([]))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("message")
      .to.be.a("string")
      .and.satisfy((msg: string) =>
        msg.startsWith("Parse jwt token failed in node env with error: ")
      );
  });

  it("should throw InternalError when fail to get access token due to AAD outage", async function() {
    // Mock AAD outage
    sandbox.restore();
    sandbox.stub(ConfidentialClientApplication.prototype, "acquireTokenOnBehalfOf").callsFake(
      (): Promise<AuthenticationResult | null> => {
        return new Promise<AuthenticationResult>(() => {
          throw new Error("AAD outage");
        });
      }
    );
    loadConfiguration();
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);

    const errorResult = await expect(oboCredential.getToken(scope)).to.eventually.be.rejectedWith(
      ErrorWithCode
    );
    assert.strictEqual(errorResult.code, ServiceError);
    assert.isTrue(
      errorResult.message!.indexOf("Failed to acquire access token on behalf of user: ") >= 0
    );
  });
});

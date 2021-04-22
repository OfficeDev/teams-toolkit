// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { ErrorWithCode, loadConfiguration, OnBehalfOfUserCredential } from "../../../../src";
import sinon from "sinon";
import mockedEnv from "mocked-env";
import {
  AuthenticationResult,
  ConfidentialClientApplication,
  OnBehalfOfRequest
} from "@azure/msal-node";

chaiUse(chaiPromises);
let mockedEnvRestore: () => void;

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

  /**
   * {
   * "aud": "test_audience",
   * "iss": "https://login.microsoftonline.com/test_aad_id/v2.0",
   * "iat": 1537231048,
   * "nbf": 1537231048,
   * "exp": 1537234948,
   * "aio": "test_aio",
   * "name": "Teams App Framework SDK Unit Test",
   * "oid": "11111111-2222-3333-4444-555555555555",
   * "preferred_username": "test@microsoft.com",
   * "rh": "test_rh",
   * "scp": "access_as_user",
   * "sub": "test_sub",
   * "tid": "test_tenant_id",
   * "uti": "test_uti",
   * "ver": "2.0"
   * }
   */
  const ssoToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ0ZXN0X2F1ZGllbmNlIiwiaXNzIjoiaHR0cHM6Ly9sb2dpbi5taWNyb3NvZnRvbmxpbmUuY29tL3Rlc3RfYWFkX2lkL3YyLjAiLCJpYXQiOjE1MzcyMzEwNDgsIm5iZiI6MTUzNzIzMTA0OCwiZXhwIjoxNTM3MjM0OTQ4LCJhaW8iOiJ0ZXN0X2FpbyIsIm5hbWUiOiJNT0RTIFRvb2xraXQgU0RLIFVuaXQgVGVzdCIsIm9pZCI6IjExMTExMTExLTIyMjItMzMzMy00NDQ0LTU1NTU1NTU1NTU1NSIsInByZWZlcnJlZF91c2VybmFtZSI6InRlc3RAbWljcm9zb2Z0LmNvbSIsInJoIjoidGVzdF9yaCIsInNjcCI6ImFjY2Vzc19hc191c2VyIiwic3ViIjoidGVzdF9zdWIiLCJ0aWQiOiJ0ZXN0X3RlbmFudF9pZCIsInV0aSI6InRlc3RfdXRpIiwidmVyIjoiMi4wIn0.SshbL1xuE1aNZD5swrWOQYgTR9QCNXkZqUebautBvKM";
  const ssoTokenExp = 1537234948;

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
      (request: OnBehalfOfRequest): Promise<AuthenticationResult | null> => {
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

  // TODO: in the future, OnBehalfOfUserCredential will return different errors based on MSAL response. (instead of returning internalError)
  it("should throw InternalError when fail to get access token due to AAD outage", async function() {
    // Mock AAD outage
    sandbox.restore();
    sandbox.stub(ConfidentialClientApplication.prototype, "acquireTokenOnBehalfOf").callsFake(
      (request: OnBehalfOfRequest): Promise<AuthenticationResult | null> => {
        return new Promise<AuthenticationResult>(() => {
          throw new Error("AAD outage");
        });
      }
    );
    loadConfiguration();
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);

    await expect(oboCredential.getToken(scope))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", InternalError);
    await expect(oboCredential.getToken(scope))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("message", "Failed to acquire access token on behalf of user: AAD outage");
  });
});

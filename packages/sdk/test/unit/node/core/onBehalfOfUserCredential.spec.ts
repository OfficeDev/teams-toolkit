// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { ErrorCode, ErrorWithCode, loadConfiguration, OnBehalfOfUserCredential } from "../../../../src";
import sinon from "sinon";
import mockedEnv from "mocked-env";
import { AuthenticationResult, ConfidentialClientApplication } from "@azure/msal-node";

chaiUse(chaiPromises);
let mockedEnvRestore: () => void;
const jwtBuilder = require("jwt-builder");

describe("OnBehalfOfUserCredential Tests - Node", () => {
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
  const ssoTokenExp = now + timeInterval;
  const ssoToken = jwtBuilder({
    algorithm: "HS256",
    secret: "super-secret",
    aud: "test_audience",
    iss: "https://login.microsoftonline.com/test_aad_id/v2.0",
    iat: now,
    nbf: now,
    exp: timeInterval,
    aio: "test_aio",
    name: "Teams Framework Unit Test",
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

  beforeEach(function () {
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

  afterEach(function () {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("create OnBehalfOfUserCredential instance should throw InvalidConfiguration Error when clientId not found", async function () {
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

  it("create OnBehalfOfUserCredential instance should throw InvalidConfiguration Error when authorityHost not found", async function () {
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

  it("create OnBehalfOfUserCredential instance should throw InvalidConfiguration Error when clientSecret not found", async function () {
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

  it("create OnBehalfOfUserCredential instance should throw InvalidConfiguration Error when tenantId not found", async function () {
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

  it("create OnBehalfOfUserCredential instance should throw InvalidConfiguration Error when clientId, clientSecret, authorityHost, tenantId not found", async function () {
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

  it("create OnBehalfOfUserCredential instance should throw InternalError with invalid sso token", async function () {
    loadConfiguration();
    const invalidSsoToken = "invalid_sso_token";

    expect(() => {
      new OnBehalfOfUserCredential(invalidSsoToken);
    })
      .to.throw(ErrorWithCode, "Parse jwt token failed in node env with error: ")
      .with.property("code", InternalError);
  });

  it("getToken should success when scopes is empty string", async function () {
    loadConfiguration();
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const token = await oboCredential.getToken("");
    assert.strictEqual(token!.token, ssoToken);
    assert.strictEqual(token!.expiresOnTimestamp, ssoTokenExp);
  });

  it("getToken should success when scopes is empty array", async function () {
    loadConfiguration();
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const token = await oboCredential.getToken([]);
    assert.strictEqual(token!.token, ssoToken);
    assert.strictEqual(token!.expiresOnTimestamp, ssoTokenExp);
  });

  it("getToken should success when scopes is string", async function () {
    loadConfiguration();
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const token = await oboCredential.getToken(scope);
    assert.strictEqual(token!.token, accessToken);
    assert.strictEqual(token!.expiresOnTimestamp, accessTokenExpNumber);
  });

  it("getToken should success when scopes is string array", async function () {
    loadConfiguration();
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const scopesArray: string[] = [scope, "fake_scope_2"];
    const token = await oboCredential.getToken(scopesArray);
    assert.strictEqual(token!.token, accessToken);
    assert.strictEqual(token!.expiresOnTimestamp, accessTokenExpNumber);
  });

  it("getToken should throw TokenExpiredError when get SSO token with sso token expired", async function () {
    const expiredSsoToken =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Im5PbzNaRHJPRFhFSzFqS1doWHNsSFJfS1hFZyJ9.eyJhdWQiOiJjZWVkYTJjNi00MDBmLTQyYjMtYjE4ZC1jY2NmYzk5NjM4NmYiLCJpc3MiOiJodHRwczovL2xvZ2luLm1pY3Jvc29mdG9ubGluZS5jb20vNzJmOTg4YmYtODZmMS00MWFmLTkxYWItMmQ3Y2QwMTFkYjQ3L3YyLjAiLCJpYXQiOjE2MTk0OTI3MzEsIm5iZiI6MTYxOTQ5MjczMSwiZXhwIjoxNjE5NDk2NjMxLCJhaW8iOiJBVFFBeS84VEFBQUFFWDZLU0prRjlOaEFDL1NXV1hWTXFPVDNnNGZXR2dqS0ZEWjRramlEb25OVlY2cDlZTVFMaTFqVXdHWEZaclpaIiwiYXpwIjoiYjBjNDdmMjktM2M1Ny00MDQyLTkzM2YtYTdkNTQ2YmFlMzg3IiwiYXpwYWNyIjoiMCIsIm5hbWUiOiJNZXRhIE9TIHNlcnZpY2UgYWNjb3VudCBmb3IgZGV2ZWxvcG1lbnQiLCJvaWQiOiIyYTYxYzRjMy1lY2Y5LTQ5ZWItYjcxNy02NjczZmZmZDg5MmQiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJtZXRhZGV2QG1pY3Jvc29mdC5jb20iLCJyaCI6IjAuQVFFQXY0ajVjdkdHcjBHUnF5MTgwQkhiUnlsX3hMQlhQRUpBa3otbjFVYTY0NGNhQUpRLiIsInNjcCI6ImFjY2Vzc19hc191c2VyIiwic3ViIjoiNEhUVXFCbWVBQVFWa2ZrbU0wcFRtVHh3QjRkcDdITGtxSjRSYXFvb3dUTSIsInRpZCI6IjcyZjk4OGJmLTg2ZjEtNDFhZi05MWFiLTJkN2NkMDExZGI0NyIsInV0aSI6ImFVQkxZSENBWmsyZE9LNW1wR2ctQUEiLCJ2ZXIiOiIyLjAifQ.QCkyqat72TS85vQ6h-jqAj-pnAOOkeOy3-WxgEQ1DJbW6fsoXmVGgso-ncMmeiYIoA1r9jy1cBfnEMBI1tBKcq4TOHseyde2uM-pxCGHNhFC_WiWy9KXKiou5bvgXdVqqCT7CQejpiNdm3wL-EFhXWBRj6OlLMLcUtnlcnKfOSmx8IIOuQrCjWtuE_wjpfo2AwkguuJ5defyOkYqlCfcJ9FyUrqhqsONMdh0lJiVY94PZ00UTjH3zPaC2tnKrGeXn-qrr9dccEUx2HqyAfdzPwymBLWMCrirVRKCZV3DtfKuozKkIxIPZz0891QZcFO8VgfBJaLmr6J7EL8lPtFKnw";
    const credential = new OnBehalfOfUserCredential(expiredSsoToken);
    let err = await expect(credential.getToken([])).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(err.code, ErrorCode.TokenExpiredError);

    err = await expect(credential.getToken("")).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(err.code, ErrorCode.TokenExpiredError);
  });

  it("getToken should throw ServiceError when fail to get access token due to AAD outage", async function () {
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

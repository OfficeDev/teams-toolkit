// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";

import * as chaiPromises from "chai-as-promised";

import {
  AuthenticationConfiguration,
  ErrorCode,
  ErrorWithCode,
  OnBehalfOfCredentialAuthConfig,
  OnBehalfOfUserCredential,
} from "../../../src";
import { SSOTokenV2Info } from "../../../src/models/ssoTokenInfo";
import { parseJwt } from "../../../src/util/utils";
import {
  convertCertificateContent,
  extractIntegrationEnvVariables,
  getSsoTokenFromTeams,
  MockAuthenticationConfiguration,
  MockEnvironmentVariable,
  RestoreEnvironmentVariable,
} from "../helper";

chaiUse(chaiPromises);
extractIntegrationEnvVariables();
let restore: () => void;

let ssoToken: string;
describe("OnBehalfOfUserCredential Tests - Node", () => {
  const defaultScope = "https://graph.microsoft.com/User.Read";
  const expiredSsoToken =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Im5PbzNaRHJPRFhFSzFqS1doWHNsSFJfS1hFZyJ9.eyJhdWQiOiJjZWVkYTJjNi00MDBmLTQyYjMtYjE4ZC1jY2NmYzk5NjM4NmYiLCJpc3MiOiJodHRwczovL2xvZ2luLm1pY3Jvc29mdG9ubGluZS5jb20vNzJmOTg4YmYtODZmMS00MWFmLTkxYWItMmQ3Y2QwMTFkYjQ3L3YyLjAiLCJpYXQiOjE2MTk0OTI3MzEsIm5iZiI6MTYxOTQ5MjczMSwiZXhwIjoxNjE5NDk2NjMxLCJhaW8iOiJBVFFBeS84VEFBQUFFWDZLU0prRjlOaEFDL1NXV1hWTXFPVDNnNGZXR2dqS0ZEWjRramlEb25OVlY2cDlZTVFMaTFqVXdHWEZaclpaIiwiYXpwIjoiYjBjNDdmMjktM2M1Ny00MDQyLTkzM2YtYTdkNTQ2YmFlMzg3IiwiYXpwYWNyIjoiMCIsIm5hbWUiOiJNZXRhIE9TIHNlcnZpY2UgYWNjb3VudCBmb3IgZGV2ZWxvcG1lbnQiLCJvaWQiOiIyYTYxYzRjMy1lY2Y5LTQ5ZWItYjcxNy02NjczZmZmZDg5MmQiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJtZXRhZGV2QG1pY3Jvc29mdC5jb20iLCJyaCI6IjAuQVFFQXY0ajVjdkdHcjBHUnF5MTgwQkhiUnlsX3hMQlhQRUpBa3otbjFVYTY0NGNhQUpRLiIsInNjcCI6ImFjY2Vzc19hc191c2VyIiwic3ViIjoiNEhUVXFCbWVBQVFWa2ZrbU0wcFRtVHh3QjRkcDdITGtxSjRSYXFvb3dUTSIsInRpZCI6IjcyZjk4OGJmLTg2ZjEtNDFhZi05MWFiLTJkN2NkMDExZGI0NyIsInV0aSI6ImFVQkxZSENBWmsyZE9LNW1wR2ctQUEiLCJ2ZXIiOiIyLjAifQ.QCkyqat72TS85vQ6h-jqAj-pnAOOkeOy3-WxgEQ1DJbW6fsoXmVGgso-ncMmeiYIoA1r9jy1cBfnEMBI1tBKcq4TOHseyde2uM-pxCGHNhFC_WiWy9KXKiou5bvgXdVqqCT7CQejpiNdm3wL-EFhXWBRj6OlLMLcUtnlcnKfOSmx8IIOuQrCjWtuE_wjpfo2AwkguuJ5defyOkYqlCfcJ9FyUrqhqsONMdh0lJiVY94PZ00UTjH3zPaC2tnKrGeXn-qrr9dccEUx2HqyAfdzPwymBLWMCrirVRKCZV3DtfKuozKkIxIPZz0891QZcFO8VgfBJaLmr6J7EL8lPtFKnw";
  let authConfig: AuthenticationConfiguration;

  before(async () => {
    restore = MockEnvironmentVariable();
    ssoToken = await getSsoTokenFromTeams();
  });

  beforeEach(async () => {
    restore = MockEnvironmentVariable();
    authConfig = MockAuthenticationConfiguration();
  });

  it("getToken should success with valid config", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken, authConfig);
    let ssoTokenFromCredential = await credential.getToken([]);
    assert.strictEqual(ssoTokenFromCredential!.token, ssoToken);

    ssoTokenFromCredential = await credential.getToken("");
    assert.strictEqual(ssoTokenFromCredential!.token, ssoToken);
  });

  it("get sso token should throw TokenExpiredError when sso token is expired", async function () {
    const credential = new OnBehalfOfUserCredential(expiredSsoToken, authConfig);
    let err = await expect(credential.getToken([])).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(err.code, ErrorCode.TokenExpiredError);

    err = await expect(credential.getToken("")).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(err.code, ErrorCode.TokenExpiredError);
  });

  it("getUserInfo should success with valid config", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken, authConfig);
    const userInfo = await credential.getUserInfo();
    const tokenObject = parseJwt(ssoToken) as SSOTokenV2Info;
    assert.strictEqual(userInfo.preferredUserName, tokenObject.preferred_username);
    assert.strictEqual(userInfo.tenantId, tokenObject.tid);
    assert.strictEqual(userInfo.objectId, tokenObject.oid);
    assert.strictEqual(userInfo.displayName, tokenObject.name);
  });

  it("get graph access token should success with valid config for Client Secret", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken, authConfig);
    const graphToken = await credential.getToken(defaultScope);
    const tokenObject = parseJwt(graphToken!.token);
    const userInfo = await credential.getUserInfo();
    assert.strictEqual(tokenObject.oid, userInfo.objectId);
    assert.strictEqual(tokenObject.aud, "https://graph.microsoft.com");
    assert.include(tokenObject.scp, "User.Read");
  });

  it("get graph access token should success with valid config for Client Certificate", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken, {
      clientId: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID,
      certificateContent: convertCertificateContent(
        process.env.SDK_INTEGRATION_TEST_M365_AAD_CERTIFICATE_CONTENT!
      ),
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST,
      tenantId: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID,
    });
    const graphToken = await credential.getToken(defaultScope);

    const tokenObject = parseJwt(graphToken!.token);
    const userInfo = await credential.getUserInfo();
    assert.strictEqual(tokenObject.oid, userInfo.objectId);
    assert.strictEqual(tokenObject.aud, "https://graph.microsoft.com");
    assert.include(tokenObject.scp, "User.Read");
  });

  it("get graph access token should success when authority host has tailing slash", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken, {
      ...authConfig,
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST + "/",
    });
    const graphToken = await credential.getToken(defaultScope);
    const tokenObject = parseJwt(graphToken!.token);
    const userInfo = await credential.getUserInfo();
    assert.strictEqual(tokenObject.oid, userInfo.objectId);
    assert.strictEqual(tokenObject.aud, "https://graph.microsoft.com");
    assert.include(tokenObject.scp, "User.Read");
  });

  it("get graph access token should throw UiRequiredError without permission", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken, authConfig);
    await expect(credential.getToken("https://graph.microsoft.com/Calendars.Read"))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.UiRequiredError);
  });

  it("get graph access token should throw TokenExpiredError when sso token is expired", async function () {
    const credential = new OnBehalfOfUserCredential(expiredSsoToken, authConfig);
    const err = await expect(credential.getToken(defaultScope)).to.eventually.be.rejectedWith(
      ErrorWithCode
    );

    assert.strictEqual(err.code, ErrorCode.TokenExpiredError);
  });

  afterEach(() => {
    RestoreEnvironmentVariable(restore);
  });
});

describe("OnBehalfOfUserCredential Tests with obo auth config - Node", () => {
  const defaultScope = "https://graph.microsoft.com/User.Read";
  const expiredSsoToken =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6Im5PbzNaRHJPRFhFSzFqS1doWHNsSFJfS1hFZyJ9.eyJhdWQiOiJjZWVkYTJjNi00MDBmLTQyYjMtYjE4ZC1jY2NmYzk5NjM4NmYiLCJpc3MiOiJodHRwczovL2xvZ2luLm1pY3Jvc29mdG9ubGluZS5jb20vNzJmOTg4YmYtODZmMS00MWFmLTkxYWItMmQ3Y2QwMTFkYjQ3L3YyLjAiLCJpYXQiOjE2MTk0OTI3MzEsIm5iZiI6MTYxOTQ5MjczMSwiZXhwIjoxNjE5NDk2NjMxLCJhaW8iOiJBVFFBeS84VEFBQUFFWDZLU0prRjlOaEFDL1NXV1hWTXFPVDNnNGZXR2dqS0ZEWjRramlEb25OVlY2cDlZTVFMaTFqVXdHWEZaclpaIiwiYXpwIjoiYjBjNDdmMjktM2M1Ny00MDQyLTkzM2YtYTdkNTQ2YmFlMzg3IiwiYXpwYWNyIjoiMCIsIm5hbWUiOiJNZXRhIE9TIHNlcnZpY2UgYWNjb3VudCBmb3IgZGV2ZWxvcG1lbnQiLCJvaWQiOiIyYTYxYzRjMy1lY2Y5LTQ5ZWItYjcxNy02NjczZmZmZDg5MmQiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJtZXRhZGV2QG1pY3Jvc29mdC5jb20iLCJyaCI6IjAuQVFFQXY0ajVjdkdHcjBHUnF5MTgwQkhiUnlsX3hMQlhQRUpBa3otbjFVYTY0NGNhQUpRLiIsInNjcCI6ImFjY2Vzc19hc191c2VyIiwic3ViIjoiNEhUVXFCbWVBQVFWa2ZrbU0wcFRtVHh3QjRkcDdITGtxSjRSYXFvb3dUTSIsInRpZCI6IjcyZjk4OGJmLTg2ZjEtNDFhZi05MWFiLTJkN2NkMDExZGI0NyIsInV0aSI6ImFVQkxZSENBWmsyZE9LNW1wR2ctQUEiLCJ2ZXIiOiIyLjAifQ.QCkyqat72TS85vQ6h-jqAj-pnAOOkeOy3-WxgEQ1DJbW6fsoXmVGgso-ncMmeiYIoA1r9jy1cBfnEMBI1tBKcq4TOHseyde2uM-pxCGHNhFC_WiWy9KXKiou5bvgXdVqqCT7CQejpiNdm3wL-EFhXWBRj6OlLMLcUtnlcnKfOSmx8IIOuQrCjWtuE_wjpfo2AwkguuJ5defyOkYqlCfcJ9FyUrqhqsONMdh0lJiVY94PZ00UTjH3zPaC2tnKrGeXn-qrr9dccEUx2HqyAfdzPwymBLWMCrirVRKCZV3DtfKuozKkIxIPZz0891QZcFO8VgfBJaLmr6J7EL8lPtFKnw";

  before(async () => {
    ssoToken = await getSsoTokenFromTeams();
  });

  it("getToken should success with valid config", async function () {
    const authConfig: OnBehalfOfCredentialAuthConfig = {
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST!,
      clientId: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID!,
      tenantId: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID!,
      clientSecret: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET!,
    };
    const credential = new OnBehalfOfUserCredential(ssoToken, authConfig);
    let ssoTokenFromCredential = await credential.getToken([]);
    assert.strictEqual(ssoTokenFromCredential!.token, ssoToken);

    ssoTokenFromCredential = await credential.getToken("");
    assert.strictEqual(ssoTokenFromCredential!.token, ssoToken);
  });

  it("get sso token should throw TokenExpiredError when sso token is expired", async function () {
    const authConfig: OnBehalfOfCredentialAuthConfig = {
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST!,
      clientId: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID!,
      tenantId: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID!,
      clientSecret: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET!,
    };
    const credential = new OnBehalfOfUserCredential(expiredSsoToken, authConfig);
    let err = await expect(credential.getToken([])).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(err.code, ErrorCode.TokenExpiredError);

    err = await expect(credential.getToken("")).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(err.code, ErrorCode.TokenExpiredError);
  });

  it("getUserInfo should success with valid config", async function () {
    const authConfig: OnBehalfOfCredentialAuthConfig = {
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST!,
      clientId: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID!,
      tenantId: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID!,
      clientSecret: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET!,
    };
    const credential = new OnBehalfOfUserCredential(ssoToken, authConfig);
    const userInfo = await credential.getUserInfo();
    const tokenObject = parseJwt(ssoToken) as SSOTokenV2Info;
    assert.strictEqual(userInfo.preferredUserName, tokenObject.preferred_username);
    assert.strictEqual(userInfo.tenantId, tokenObject.tid);
    assert.strictEqual(userInfo.objectId, tokenObject.oid);
    assert.strictEqual(userInfo.displayName, tokenObject.name);
  });

  it("get graph access token should success with valid config for Client Secret", async function () {
    const authConfig: OnBehalfOfCredentialAuthConfig = {
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST!,
      clientId: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID!,
      tenantId: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID!,
      clientSecret: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET!,
    };
    const credential = new OnBehalfOfUserCredential(ssoToken, authConfig);
    const graphToken = await credential.getToken(defaultScope);
    const tokenObject = parseJwt(graphToken!.token);
    const userInfo = await credential.getUserInfo();
    assert.strictEqual(tokenObject.oid, userInfo.objectId);
    assert.strictEqual(tokenObject.aud, "https://graph.microsoft.com");
    assert.include(tokenObject.scp, "User.Read");
  });

  it("get graph access token should success with valid config for Client Certificate", async function () {
    const authConfig: OnBehalfOfCredentialAuthConfig = {
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST!,
      clientId: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID!,
      tenantId: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID!,
      certificateContent: convertCertificateContent(
        process.env.SDK_INTEGRATION_TEST_M365_AAD_CERTIFICATE_CONTENT!
      ),
    };
    const credential = new OnBehalfOfUserCredential(ssoToken, authConfig);
    const graphToken = await credential.getToken(defaultScope);

    const tokenObject = parseJwt(graphToken!.token);
    const userInfo = await credential.getUserInfo();
    assert.strictEqual(tokenObject.oid, userInfo.objectId);
    assert.strictEqual(tokenObject.aud, "https://graph.microsoft.com");
    assert.include(tokenObject.scp, "User.Read");
  });

  it("get graph access token should success when authority host has tailing slash", async function () {
    const authConfig: OnBehalfOfCredentialAuthConfig = {
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST! + "/",
      clientId: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID!,
      tenantId: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID!,
      certificateContent: convertCertificateContent(
        process.env.SDK_INTEGRATION_TEST_M365_AAD_CERTIFICATE_CONTENT!
      ),
    };

    const credential = new OnBehalfOfUserCredential(ssoToken, authConfig);
    const graphToken = await credential.getToken(defaultScope);
    const tokenObject = parseJwt(graphToken!.token);
    const userInfo = await credential.getUserInfo();
    assert.strictEqual(tokenObject.oid, userInfo.objectId);
    assert.strictEqual(tokenObject.aud, "https://graph.microsoft.com");
    assert.include(tokenObject.scp, "User.Read");
  });

  it("get graph access token should throw UiRequiredError without permission", async function () {
    const authConfig: OnBehalfOfCredentialAuthConfig = {
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST!,
      clientId: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID!,
      tenantId: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID!,
      clientSecret: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET!,
    };
    const credential = new OnBehalfOfUserCredential(ssoToken, authConfig);
    await expect(credential.getToken("https://graph.microsoft.com/Calendars.Read"))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.UiRequiredError);
  });

  it("get graph access token should throw TokenExpiredError when sso token is expired", async function () {
    const authConfig: OnBehalfOfCredentialAuthConfig = {
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST!,
      clientId: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID!,
      tenantId: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID!,
      clientSecret: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_SECRET!,
    };
    const credential = new OnBehalfOfUserCredential(expiredSsoToken, authConfig);
    const err = await expect(credential.getToken(defaultScope)).to.eventually.be.rejectedWith(
      ErrorWithCode
    );

    assert.strictEqual(err.code, ErrorCode.TokenExpiredError);
  });

  afterEach(() => {
    RestoreEnvironmentVariable(restore);
  });
});

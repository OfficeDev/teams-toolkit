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
    "eyJ0eXAiOiJKV1QiLCJub25jZSI6InBkaU9kUHU5bWFhMHVYTG9wRDNJbTNtN1p5Ym1ra05TZHNvdG5STWt0SzgiLCJhbGciOiJSUzI1NiIsIng1dCI6Ii1LSTNROW5OUjdiUm9meG1lWm9YcWJIWkdldyIsImtpZCI6Ii1LSTNROW5OUjdiUm9meG1lWm9YcWJIWkdldyJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC82ZDdhOGJjZS00ODZlLTQ5ZWEtYjRiNi1lNzA5ZjNmZjQwY2QvIiwiaWF0IjoxNjg2MDE4OTI0LCJuYmYiOjE2ODYwMTg5MjQsImV4cCI6MTY4NjEwNTYyNCwiYWNjdCI6MCwiYWNyIjoiMSIsImFpbyI6IkFUUUF5LzhUQUFBQXE4Z0E2ZlFNWkY0OTlZM0VhdVJuNWhnYlgzSzRMMEtuY1M2SXppakpmQnhQcTZmZEJ6WDRndjdjVFZsYUFzdmQiLCJhbXIiOlsicHdkIl0sImFwcF9kaXNwbGF5bmFtZSI6IkdyYXBoIEV4cGxvcmVyIiwiYXBwaWQiOiJkZThiYzhiNS1kOWY5LTQ4YjEtYThhZC1iNzQ4ZGE3MjUwNjQiLCJhcHBpZGFjciI6IjAiLCJpZHR5cCI6InVzZXIiLCJpcGFkZHIiOiIyNDA0OmY4MDE6OTAwMDoxODplNGJjOjM5YjI6NGM0Mzo1NzhkIiwibmFtZSI6IkludGVncmF0aW9uIFRlc3QiLCJvaWQiOiIzNjczOTVkOS0wMjRkLTQzYjYtYTk5NC0zYTBjMjIzYjdhODAiLCJwbGF0ZiI6IjMiLCJwdWlkIjoiMTAwMzIwMDFEQTM4NDE4OSIsInJoIjoiMC5BWEFBem90NmJXNUk2a20wdHVjSjhfOUF6UU1BQUFBQUFBQUF3QUFBQUFBQUFBQndBSmcuIiwic2NwIjoib3BlbmlkIHByb2ZpbGUgVXNlci5SZWFkIGVtYWlsIiwic3ViIjoibVNiZ3hlYmtSalBoeWE0MjFTdTdyYlRycTE4Q3dpTDdDNG5WaTdnTXNsbyIsInRlbmFudF9yZWdpb25fc2NvcGUiOiJBUyIsInRpZCI6IjZkN2E4YmNlLTQ4NmUtNDllYS1iNGI2LWU3MDlmM2ZmNDBjZCIsInVuaXF1ZV9uYW1lIjoidGVzdGJvdEBuaW5ndGFuZy5vbm1pY3Jvc29mdC5jb20iLCJ1cG4iOiJ0ZXN0Ym90QG5pbmd0YW5nLm9ubWljcm9zb2Z0LmNvbSIsInV0aSI6IkdaajlCLWpkMDBtclgxb3ltU2VYQVEiLCJ2ZXIiOiIxLjAiLCJ3aWRzIjpbImI3OWZiZjRkLTNlZjktNDY4OS04MTQzLTc2YjE5NGU4NTUwOSJdLCJ4bXNfY2MiOlsiQ1AxIl0sInhtc19zc20iOiIxIiwieG1zX3N0Ijp7InN1YiI6Ikd2X2lEQWlrZGF1cFE1S3Mtc2RHNXBNbDE4OXVtV1NVZlAxR3o1YlpLYTAifSwieG1zX3RjZHQiOjE2MTczNDQ5NDJ9.Kdx5NYlhZfRUaJGbAqlsmL4IsiaWMXHt4pl9_YT5KQksQupnhALWPDp0ORHURCk981ulRYLAC3e_G0hcKnQmTOour2niY-ceTCuviN6Pyip-L-dIATvXcehx-GJ6FFwSoXr62hWLefhhV2RnjK3PD6s9ElQw8fgYshOZPeULU1dp7cLKO1AwqzUWCInm9ShnA1hxkUVS-MDPwycomkT8tQC6K3wI6dpJpqJ2tQ8eNsFRqbhbdRbr63J7C29jQtTPYO0YzE0iZ834uVu5XbuheeJj1hInhdib5QQ_FB19JfcYFUCiYPxN31tc78uv3ZMUJCPRW2rx2do2iHRZIWU7aQ";
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
    "eyJ0eXAiOiJKV1QiLCJub25jZSI6InBkaU9kUHU5bWFhMHVYTG9wRDNJbTNtN1p5Ym1ra05TZHNvdG5STWt0SzgiLCJhbGciOiJSUzI1NiIsIng1dCI6Ii1LSTNROW5OUjdiUm9meG1lWm9YcWJIWkdldyIsImtpZCI6Ii1LSTNROW5OUjdiUm9meG1lWm9YcWJIWkdldyJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC82ZDdhOGJjZS00ODZlLTQ5ZWEtYjRiNi1lNzA5ZjNmZjQwY2QvIiwiaWF0IjoxNjg2MDE4OTI0LCJuYmYiOjE2ODYwMTg5MjQsImV4cCI6MTY4NjEwNTYyNCwiYWNjdCI6MCwiYWNyIjoiMSIsImFpbyI6IkFUUUF5LzhUQUFBQXE4Z0E2ZlFNWkY0OTlZM0VhdVJuNWhnYlgzSzRMMEtuY1M2SXppakpmQnhQcTZmZEJ6WDRndjdjVFZsYUFzdmQiLCJhbXIiOlsicHdkIl0sImFwcF9kaXNwbGF5bmFtZSI6IkdyYXBoIEV4cGxvcmVyIiwiYXBwaWQiOiJkZThiYzhiNS1kOWY5LTQ4YjEtYThhZC1iNzQ4ZGE3MjUwNjQiLCJhcHBpZGFjciI6IjAiLCJpZHR5cCI6InVzZXIiLCJpcGFkZHIiOiIyNDA0OmY4MDE6OTAwMDoxODplNGJjOjM5YjI6NGM0Mzo1NzhkIiwibmFtZSI6IkludGVncmF0aW9uIFRlc3QiLCJvaWQiOiIzNjczOTVkOS0wMjRkLTQzYjYtYTk5NC0zYTBjMjIzYjdhODAiLCJwbGF0ZiI6IjMiLCJwdWlkIjoiMTAwMzIwMDFEQTM4NDE4OSIsInJoIjoiMC5BWEFBem90NmJXNUk2a20wdHVjSjhfOUF6UU1BQUFBQUFBQUF3QUFBQUFBQUFBQndBSmcuIiwic2NwIjoib3BlbmlkIHByb2ZpbGUgVXNlci5SZWFkIGVtYWlsIiwic3ViIjoibVNiZ3hlYmtSalBoeWE0MjFTdTdyYlRycTE4Q3dpTDdDNG5WaTdnTXNsbyIsInRlbmFudF9yZWdpb25fc2NvcGUiOiJBUyIsInRpZCI6IjZkN2E4YmNlLTQ4NmUtNDllYS1iNGI2LWU3MDlmM2ZmNDBjZCIsInVuaXF1ZV9uYW1lIjoidGVzdGJvdEBuaW5ndGFuZy5vbm1pY3Jvc29mdC5jb20iLCJ1cG4iOiJ0ZXN0Ym90QG5pbmd0YW5nLm9ubWljcm9zb2Z0LmNvbSIsInV0aSI6IkdaajlCLWpkMDBtclgxb3ltU2VYQVEiLCJ2ZXIiOiIxLjAiLCJ3aWRzIjpbImI3OWZiZjRkLTNlZjktNDY4OS04MTQzLTc2YjE5NGU4NTUwOSJdLCJ4bXNfY2MiOlsiQ1AxIl0sInhtc19zc20iOiIxIiwieG1zX3N0Ijp7InN1YiI6Ikd2X2lEQWlrZGF1cFE1S3Mtc2RHNXBNbDE4OXVtV1NVZlAxR3o1YlpLYTAifSwieG1zX3RjZHQiOjE2MTczNDQ5NDJ9.Kdx5NYlhZfRUaJGbAqlsmL4IsiaWMXHt4pl9_YT5KQksQupnhALWPDp0ORHURCk981ulRYLAC3e_G0hcKnQmTOour2niY-ceTCuviN6Pyip-L-dIATvXcehx-GJ6FFwSoXr62hWLefhhV2RnjK3PD6s9ElQw8fgYshOZPeULU1dp7cLKO1AwqzUWCInm9ShnA1hxkUVS-MDPwycomkT8tQC6K3wI6dpJpqJ2tQ8eNsFRqbhbdRbr63J7C29jQtTPYO0YzE0iZ834uVu5XbuheeJj1hInhdib5QQ_FB19JfcYFUCiYPxN31tc78uv3ZMUJCPRW2rx2do2iHRZIWU7aQ";

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

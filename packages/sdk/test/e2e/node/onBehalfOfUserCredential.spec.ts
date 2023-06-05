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
    "eyJ0eXAiOiJKV1QiLCJub25jZSI6Im1zNXZ6dHpFTGhGSEZraGl1ZEpGbXRRSXJ2N3RyTDFIVmRYTllPY0VjYkEiLCJhbGciOiJSUzI1NiIsIng1dCI6Ii1LSTNROW5OUjdiUm9meG1lWm9YcWJIWkdldyIsImtpZCI6Ii1LSTNROW5OUjdiUm9meG1lWm9YcWJIWkdldyJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC83MmY5ODhiZi04NmYxLTQxYWYtOTFhYi0yZDdjZDAxMWRiNDcvIiwiaWF0IjoxNjg1OTQ4NzIxLCJuYmYiOjE2ODU5NDg3MjEsImV4cCI6MTY4NTk1NDA2NiwiYWNjdCI6MCwiYWNyIjoiMSIsImFjcnMiOlsidXJuOnVzZXI6cmVnaXN0ZXJzZWN1cml0eWluZm8iXSwiYWlvIjoiQVlRQWUvOFRBQUFBRGV6S3VmTERpVlVHL2hDd25nOVN2bXFyT2dwQ3g5YUFVelppVG1VUlZsdWlKN2ZHSHVzUndiRWNSV1dmREVORFBUN0NmdkhKVTJpdTVTVFgxekpISmVzNG05TnRQVzdocEZsQmNKU0pmYWlrNVZYRUZKeGwweUM3bHVYR3RiWkp3UlRIUVhnanpIbVVNa3hsaXA1eERyRUhwdko1SWppV21uM3ZramduaDVFPSIsImFtciI6WyJyc2EiLCJtZmEiXSwiYXBwX2Rpc3BsYXluYW1lIjoiR3JhcGggRXhwbG9yZXIiLCJhcHBpZCI6ImRlOGJjOGI1LWQ5ZjktNDhiMS1hOGFkLWI3NDhkYTcyNTA2NCIsImFwcGlkYWNyIjoiMCIsImNhcG9saWRzX2xhdGViaW5kIjpbIjU5NTZmZjVhLTZmZGItNDc3ZS05ZDRkLTlmN2QyNjJlNjk0YSJdLCJjb250cm9scyI6WyJhcHBfcmVzIl0sImNvbnRyb2xzX2F1ZHMiOlsiZGU4YmM4YjUtZDlmOS00OGIxLWE4YWQtYjc0OGRhNzI1MDY0IiwiMDAwMDAwMDMtMDAwMC0wMDAwLWMwMDAtMDAwMDAwMDAwMDAwIiwiMDAwMDAwMDMtMDAwMC0wZmYxLWNlMDAtMDAwMDAwMDAwMDAwIl0sImRldmljZWlkIjoiOTA0YjU3MGYtYzA2Zi00OTUxLTlkZmEtYTcwM2FkOTdmOTk0IiwiZmFtaWx5X25hbWUiOiJaaGFvIiwiZ2l2ZW5fbmFtZSI6IllpcWluZyIsImlkdHlwIjoidXNlciIsImlwYWRkciI6IjE4My4xOTQuMTY4LjE1OSIsIm5hbWUiOiJZaXFpbmcgWmhhbyIsIm9pZCI6ImY0N2FjZTIyLWU2OTctNDI0Yy05OWMzLWExOWRjNzVjMDA5YSIsIm9ucHJlbV9zaWQiOiJTLTEtNS0yMS0yMTI3NTIxMTg0LTE2MDQwMTI5MjAtMTg4NzkyNzUyNy01OTA4ODQxMiIsInBsYXRmIjoiMyIsInB1aWQiOiIxMDAzMjAwMjBGNEQyNDEyIiwicmgiOiIwLkFSb0F2NGo1Y3ZHR3IwR1JxeTE4MEJIYlJ3TUFBQUFBQUFBQXdBQUFBQUFBQUFBYUFEMC4iLCJzY3AiOiJDYWxlbmRhcnMuUmVhZFdyaXRlIENvbnRhY3RzLlJlYWRXcml0ZSBEZXZpY2VNYW5hZ2VtZW50QXBwcy5SZWFkV3JpdGUuQWxsIERldmljZU1hbmFnZW1lbnRDb25maWd1cmF0aW9uLlJlYWQuQWxsIERldmljZU1hbmFnZW1lbnRDb25maWd1cmF0aW9uLlJlYWRXcml0ZS5BbGwgRGV2aWNlTWFuYWdlbWVudE1hbmFnZWREZXZpY2VzLlByaXZpbGVnZWRPcGVyYXRpb25zLkFsbCBEZXZpY2VNYW5hZ2VtZW50TWFuYWdlZERldmljZXMuUmVhZC5BbGwgRGV2aWNlTWFuYWdlbWVudE1hbmFnZWREZXZpY2VzLlJlYWRXcml0ZS5BbGwgRGV2aWNlTWFuYWdlbWVudFJCQUMuUmVhZC5BbGwgRGV2aWNlTWFuYWdlbWVudFJCQUMuUmVhZFdyaXRlLkFsbCBEZXZpY2VNYW5hZ2VtZW50U2VydmljZUNvbmZpZy5SZWFkLkFsbCBEZXZpY2VNYW5hZ2VtZW50U2VydmljZUNvbmZpZy5SZWFkV3JpdGUuQWxsIERpcmVjdG9yeS5BY2Nlc3NBc1VzZXIuQWxsIERpcmVjdG9yeS5SZWFkV3JpdGUuQWxsIEZpbGVzLlJlYWRXcml0ZS5BbGwgR3JvdXAuUmVhZFdyaXRlLkFsbCBJZGVudGl0eVJpc2tFdmVudC5SZWFkLkFsbCBNYWlsLlJlYWRXcml0ZSBNYWlsYm94U2V0dGluZ3MuUmVhZFdyaXRlIE5vdGVzLlJlYWRXcml0ZS5BbGwgb3BlbmlkIFBlb3BsZS5SZWFkIFBvbGljeS5SZWFkLkFsbCBQcmVzZW5jZS5SZWFkIFByZXNlbmNlLlJlYWQuQWxsIHByb2ZpbGUgUmVwb3J0cy5SZWFkLkFsbCBTaXRlcy5SZWFkV3JpdGUuQWxsIFRhc2tzLlJlYWRXcml0ZSBVc2VyLlJlYWQgVXNlci5SZWFkQmFzaWMuQWxsIFVzZXIuUmVhZFdyaXRlIFVzZXIuUmVhZFdyaXRlLkFsbCBlbWFpbCIsInNpZ25pbl9zdGF0ZSI6WyJkdmNfbW5nZCIsImR2Y19jbXAiLCJrbXNpIl0sInN1YiI6InVlNExEeVR4VkxxWXQzOHVjMGlZejkza1RtV0xXV1RveUV0aGdBb05abUUiLCJ0ZW5hbnRfcmVnaW9uX3Njb3BlIjoiV1ciLCJ0aWQiOiI3MmY5ODhiZi04NmYxLTQxYWYtOTFhYi0yZDdjZDAxMWRiNDciLCJ1bmlxdWVfbmFtZSI6InlpcWluZ3poYW9AbWljcm9zb2Z0LmNvbSIsInVwbiI6InlpcWluZ3poYW9AbWljcm9zb2Z0LmNvbSIsInV0aSI6Im1jWkxieTd0dkU2Z0c0M2pDTndrQUEiLCJ2ZXIiOiIxLjAiLCJ3aWRzIjpbImI3OWZiZjRkLTNlZjktNDY4OS04MTQzLTc2YjE5NGU4NTUwOSJdLCJ4bXNfY2MiOlsiQ1AxIl0sInhtc19zc20iOiIxIiwieG1zX3N0Ijp7InN1YiI6IjlfbFZmcS1iYThRdUFlc1FVYVpNZnN3cV93YU85bnlaYVBvbnJ1UnhGbkEifSwieG1zX3RjZHQiOjEyODkyNDE1NDd9.L3XtmiFr7YpJrJR43TC-41ZK57_QMc8S3Yd6mq0eqEMSbc84NNI0BIt1gTJqNlGzmisTG6Q5pHbHz9UN7dZto2JxxQpwhsE02qIJ24SKTskQeYz63Wdv9EJ87chGMJl0k68s_uGgx62mIQTpUKKzXyvi5Wwa4vib-exuY9Xq3sgaGouElCqdc1rnPjRAXAKKJkQvsy4KU6ogmaozE4RFDv1m-EJeAAlQROG3MhHyzbvs4BxRQpGJRDiTnqV7DkelzPLSYBQkKsmXmWoLO3wXSeJX8hBwxokkicQsOxdmiupEw1vDdKpCLfaubMChbvuRbkIRsFIzkfrL3H8TNsq48g";
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
    "eyJ0eXAiOiJKV1QiLCJub25jZSI6Im1zNXZ6dHpFTGhGSEZraGl1ZEpGbXRRSXJ2N3RyTDFIVmRYTllPY0VjYkEiLCJhbGciOiJSUzI1NiIsIng1dCI6Ii1LSTNROW5OUjdiUm9meG1lWm9YcWJIWkdldyIsImtpZCI6Ii1LSTNROW5OUjdiUm9meG1lWm9YcWJIWkdldyJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC83MmY5ODhiZi04NmYxLTQxYWYtOTFhYi0yZDdjZDAxMWRiNDcvIiwiaWF0IjoxNjg1OTQ4NzIxLCJuYmYiOjE2ODU5NDg3MjEsImV4cCI6MTY4NTk1NDA2NiwiYWNjdCI6MCwiYWNyIjoiMSIsImFjcnMiOlsidXJuOnVzZXI6cmVnaXN0ZXJzZWN1cml0eWluZm8iXSwiYWlvIjoiQVlRQWUvOFRBQUFBRGV6S3VmTERpVlVHL2hDd25nOVN2bXFyT2dwQ3g5YUFVelppVG1VUlZsdWlKN2ZHSHVzUndiRWNSV1dmREVORFBUN0NmdkhKVTJpdTVTVFgxekpISmVzNG05TnRQVzdocEZsQmNKU0pmYWlrNVZYRUZKeGwweUM3bHVYR3RiWkp3UlRIUVhnanpIbVVNa3hsaXA1eERyRUhwdko1SWppV21uM3ZramduaDVFPSIsImFtciI6WyJyc2EiLCJtZmEiXSwiYXBwX2Rpc3BsYXluYW1lIjoiR3JhcGggRXhwbG9yZXIiLCJhcHBpZCI6ImRlOGJjOGI1LWQ5ZjktNDhiMS1hOGFkLWI3NDhkYTcyNTA2NCIsImFwcGlkYWNyIjoiMCIsImNhcG9saWRzX2xhdGViaW5kIjpbIjU5NTZmZjVhLTZmZGItNDc3ZS05ZDRkLTlmN2QyNjJlNjk0YSJdLCJjb250cm9scyI6WyJhcHBfcmVzIl0sImNvbnRyb2xzX2F1ZHMiOlsiZGU4YmM4YjUtZDlmOS00OGIxLWE4YWQtYjc0OGRhNzI1MDY0IiwiMDAwMDAwMDMtMDAwMC0wMDAwLWMwMDAtMDAwMDAwMDAwMDAwIiwiMDAwMDAwMDMtMDAwMC0wZmYxLWNlMDAtMDAwMDAwMDAwMDAwIl0sImRldmljZWlkIjoiOTA0YjU3MGYtYzA2Zi00OTUxLTlkZmEtYTcwM2FkOTdmOTk0IiwiZmFtaWx5X25hbWUiOiJaaGFvIiwiZ2l2ZW5fbmFtZSI6IllpcWluZyIsImlkdHlwIjoidXNlciIsImlwYWRkciI6IjE4My4xOTQuMTY4LjE1OSIsIm5hbWUiOiJZaXFpbmcgWmhhbyIsIm9pZCI6ImY0N2FjZTIyLWU2OTctNDI0Yy05OWMzLWExOWRjNzVjMDA5YSIsIm9ucHJlbV9zaWQiOiJTLTEtNS0yMS0yMTI3NTIxMTg0LTE2MDQwMTI5MjAtMTg4NzkyNzUyNy01OTA4ODQxMiIsInBsYXRmIjoiMyIsInB1aWQiOiIxMDAzMjAwMjBGNEQyNDEyIiwicmgiOiIwLkFSb0F2NGo1Y3ZHR3IwR1JxeTE4MEJIYlJ3TUFBQUFBQUFBQXdBQUFBQUFBQUFBYUFEMC4iLCJzY3AiOiJDYWxlbmRhcnMuUmVhZFdyaXRlIENvbnRhY3RzLlJlYWRXcml0ZSBEZXZpY2VNYW5hZ2VtZW50QXBwcy5SZWFkV3JpdGUuQWxsIERldmljZU1hbmFnZW1lbnRDb25maWd1cmF0aW9uLlJlYWQuQWxsIERldmljZU1hbmFnZW1lbnRDb25maWd1cmF0aW9uLlJlYWRXcml0ZS5BbGwgRGV2aWNlTWFuYWdlbWVudE1hbmFnZWREZXZpY2VzLlByaXZpbGVnZWRPcGVyYXRpb25zLkFsbCBEZXZpY2VNYW5hZ2VtZW50TWFuYWdlZERldmljZXMuUmVhZC5BbGwgRGV2aWNlTWFuYWdlbWVudE1hbmFnZWREZXZpY2VzLlJlYWRXcml0ZS5BbGwgRGV2aWNlTWFuYWdlbWVudFJCQUMuUmVhZC5BbGwgRGV2aWNlTWFuYWdlbWVudFJCQUMuUmVhZFdyaXRlLkFsbCBEZXZpY2VNYW5hZ2VtZW50U2VydmljZUNvbmZpZy5SZWFkLkFsbCBEZXZpY2VNYW5hZ2VtZW50U2VydmljZUNvbmZpZy5SZWFkV3JpdGUuQWxsIERpcmVjdG9yeS5BY2Nlc3NBc1VzZXIuQWxsIERpcmVjdG9yeS5SZWFkV3JpdGUuQWxsIEZpbGVzLlJlYWRXcml0ZS5BbGwgR3JvdXAuUmVhZFdyaXRlLkFsbCBJZGVudGl0eVJpc2tFdmVudC5SZWFkLkFsbCBNYWlsLlJlYWRXcml0ZSBNYWlsYm94U2V0dGluZ3MuUmVhZFdyaXRlIE5vdGVzLlJlYWRXcml0ZS5BbGwgb3BlbmlkIFBlb3BsZS5SZWFkIFBvbGljeS5SZWFkLkFsbCBQcmVzZW5jZS5SZWFkIFByZXNlbmNlLlJlYWQuQWxsIHByb2ZpbGUgUmVwb3J0cy5SZWFkLkFsbCBTaXRlcy5SZWFkV3JpdGUuQWxsIFRhc2tzLlJlYWRXcml0ZSBVc2VyLlJlYWQgVXNlci5SZWFkQmFzaWMuQWxsIFVzZXIuUmVhZFdyaXRlIFVzZXIuUmVhZFdyaXRlLkFsbCBlbWFpbCIsInNpZ25pbl9zdGF0ZSI6WyJkdmNfbW5nZCIsImR2Y19jbXAiLCJrbXNpIl0sInN1YiI6InVlNExEeVR4VkxxWXQzOHVjMGlZejkza1RtV0xXV1RveUV0aGdBb05abUUiLCJ0ZW5hbnRfcmVnaW9uX3Njb3BlIjoiV1ciLCJ0aWQiOiI3MmY5ODhiZi04NmYxLTQxYWYtOTFhYi0yZDdjZDAxMWRiNDciLCJ1bmlxdWVfbmFtZSI6InlpcWluZ3poYW9AbWljcm9zb2Z0LmNvbSIsInVwbiI6InlpcWluZ3poYW9AbWljcm9zb2Z0LmNvbSIsInV0aSI6Im1jWkxieTd0dkU2Z0c0M2pDTndrQUEiLCJ2ZXIiOiIxLjAiLCJ3aWRzIjpbImI3OWZiZjRkLTNlZjktNDY4OS04MTQzLTc2YjE5NGU4NTUwOSJdLCJ4bXNfY2MiOlsiQ1AxIl0sInhtc19zc20iOiIxIiwieG1zX3N0Ijp7InN1YiI6IjlfbFZmcS1iYThRdUFlc1FVYVpNZnN3cV93YU85bnlaYVBvbnJ1UnhGbkEifSwieG1zX3RjZHQiOjEyODkyNDE1NDd9.L3XtmiFr7YpJrJR43TC-41ZK57_QMc8S3Yd6mq0eqEMSbc84NNI0BIt1gTJqNlGzmisTG6Q5pHbHz9UN7dZto2JxxQpwhsE02qIJ24SKTskQeYz63Wdv9EJ87chGMJl0k68s_uGgx62mIQTpUKKzXyvi5Wwa4vib-exuY9Xq3sgaGouElCqdc1rnPjRAXAKKJkQvsy4KU6ogmaozE4RFDv1m-EJeAAlQROG3MhHyzbvs4BxRQpGJRDiTnqV7DkelzPLSYBQkKsmXmWoLO3wXSeJX8hBwxokkicQsOxdmiupEw1vDdKpCLfaubMChbvuRbkIRsFIzkfrL3H8TNsq48g";

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

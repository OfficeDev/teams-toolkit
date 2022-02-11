// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import { AuthenticationConfiguration, M365TenantCredential } from "../../../src";
import { ErrorCode, ErrorWithCode } from "../../../src/core/errors";
import jwtDecode from "jwt-decode";
import {
  MockAuthenticationConfiguration,
  AADJwtPayLoad,
  convertCertificateContent,
} from "../helper";

chaiUse(chaiPromises);
describe("M365TenantCredential Tests - Node", () => {
  const fake_client_secret = "fake_client_secret";
  const defaultGraphScope = ["https://graph.microsoft.com/.default"];
  let authConfig: AuthenticationConfiguration;

  beforeEach(function () {
    authConfig = MockAuthenticationConfiguration();
  });

  it("create M365TenantCredential instance should success with valid configuration", function () {
    const credential: any = new M365TenantCredential(authConfig);

    assert.strictEqual(credential.msalClient.config.auth.clientId, authConfig.clientId);
    assert.strictEqual(
      credential.msalClient.config.auth.authority,
      authConfig.authorityHost + "/" + authConfig.tenantId
    );
    assert.strictEqual(credential.msalClient.config.auth.clientSecret, authConfig.clientSecret);
  });

  it("getToken should success with .default scope when authority host has tailing slash", async function () {
    const credential = new M365TenantCredential({
      ...authConfig,
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST + "/",
    });
    const token = await credential.getToken(defaultGraphScope);

    const decodedToken = jwtDecode<AADJwtPayLoad>(token!.token);
    assert.strictEqual(decodedToken.aud, "https://graph.microsoft.com");
    assert.strictEqual(decodedToken.appid, authConfig.clientId);
    assert.strictEqual(decodedToken.idtyp, "app");
  });

  it("getToken should success with .default scope for Client Secret", async function () {
    const credential = new M365TenantCredential(authConfig);
    const token = await credential.getToken(defaultGraphScope);

    const decodedToken = jwtDecode<AADJwtPayLoad>(token!.token);
    assert.strictEqual(decodedToken.aud, "https://graph.microsoft.com");
    assert.strictEqual(decodedToken.appid, authConfig.clientId);
    assert.strictEqual(decodedToken.idtyp, "app");
  });

  it("getToken should success with .default scope for Client Certificate", async function () {
    const credential = new M365TenantCredential({
      clientId: process.env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID,
      certificateContent: convertCertificateContent(
        process.env.SDK_INTEGRATION_TEST_M365_AAD_CERTIFICATE_CONTENT!
      ),
      authorityHost: process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST,
      tenantId: process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID,
    });
    const token = await credential.getToken(defaultGraphScope);

    const decodedToken = jwtDecode<AADJwtPayLoad>(token!.token);
    assert.strictEqual(decodedToken.aud, "https://graph.microsoft.com");
    assert.strictEqual(decodedToken.appid, authConfig.clientId);
    assert.strictEqual(decodedToken.idtyp, "app");
  });

  it("getToken should throw ServiceError with invalid secret", async function () {
    const credential = new M365TenantCredential({
      ...authConfig,
      clientSecret: fake_client_secret,
    });

    const errorResult = await expect(
      credential.getToken(defaultGraphScope)
    ).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(errorResult.code, ErrorCode.ServiceError);
    assert.include(
      errorResult.message,
      "Get M365 tenant credential failed with error: invalid_client: 7000215"
    );
  });
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken, AuthenticationError, ClientSecretCredential } from "@azure/identity";
import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import sinon from "sinon";
import mockedEnv from "mocked-env";
import { loadConfiguration, M365TenantCredential } from "../../../src";
import { ErrorCode, ErrorWithCode } from "../../../src/core/errors";
import fs from "fs";
import { AuthenticationResult, ConfidentialClientApplication } from "@azure/msal-node";

chaiUse(chaiPromises);
let mockedEnvRestore: () => void;

describe("M365TenantCredential Tests - Node", () => {
  const scopes = "fake_scope";
  const clientId = "fake_client_id";
  const tenantId = "fake-tenant-id";
  const clientSecret = "fake_client_secret";
  const certificateContent = `-----BEGIN PRIVATE KEY-----
fakeKey
-----END PRIVATE KEY-----
-----BEGIN CERTIFICATE-----
fakeCert
-----END CERTIFICATE-----`;
  const authorityHost = "https://fake_authority_host";
  const fakeToken = "fake_token";

  beforeEach(function () {
    mockedEnvRestore = mockedEnv(
      {
        M365_CLIENT_ID: clientId,
        M365_CLIENT_SECRET: clientSecret,
        M365_TENANT_ID: tenantId,
        M365_AUTHORITY_HOST: authorityHost,
      },
      { clear: true }
    );
    loadConfiguration();
  });

  afterEach(function () {
    mockedEnvRestore();
  });

  it("getToken should throw InvalidParameter error with invalid scopes", async function () {
    const invalidScopes: any = [new Error()];
    const credential = new M365TenantCredential();
    const errorResult = await expect(
      credential.getToken(invalidScopes)
    ).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(errorResult.code, ErrorCode.InvalidParameter);
    assert.strictEqual(
      errorResult.message,
      "The type of scopes is not valid, it must be string or string array"
    );
  });

  it("create M365TenantCredential instance should success with valid config for Client Secret", function () {
    loadConfiguration();

    const credential: any = new M365TenantCredential();

    assert.strictEqual(credential.clientSecretCredential.clientId, clientId);
    assert.strictEqual(credential.clientSecretCredential.tenantId, tenantId);
    assert.strictEqual(credential.clientSecretCredential.clientSecret, clientSecret);
    assert.strictEqual(
      credential.clientSecretCredential.identityClient.authorityHost,
      authorityHost
    );
  });

  it("create M365TenantCredential instance should success with valid config for Client Certificate", function () {
    loadConfiguration({
      authentication: {
        clientId: clientId,
        certificateContent: certificateContent,
        authorityHost: authorityHost,
        tenantId: tenantId,
      },
    });

    const credential: any = new M365TenantCredential();

    assert.strictEqual(credential.msalClient.config.auth.clientId, clientId);
    assert.strictEqual(credential.msalClient.config.auth.authority, authorityHost + "/" + tenantId);
    assert.strictEqual(
      credential.msalClient.config.auth.clientCertificate.thumbprint,
      "06BA994A93FF2138DC51E669EB284ABAB8112153" // thumbprint is calculated from certificate content "fakeCert"
    );
    assert.strictEqual(credential.msalClient.config.auth.clientSecret, "");
  });

  it("create M365TenantCredential instance should success and respect certificateContent when both Client Secret and Client Certificate are set", function () {
    loadConfiguration({
      authentication: {
        clientId: clientId,
        clientSecret: clientSecret,
        certificateContent: certificateContent,
        authorityHost: authorityHost,
        tenantId: tenantId,
      },
    });

    const credential: any = new M365TenantCredential();

    // certificateContent has higher priority than clientSecret
    assert.exists(credential.msalClient);
    assert.notExists(credential.clientSecretCredential);
  });

  it("create M365TenantCredential instance should throw InvalidConfiguration when configuration is not valid", function () {
    delete process.env.M365_CLIENT_ID;
    delete process.env.M365_TENANT_ID;
    delete process.env.M365_CLIENT_SECRET;
    delete process.env.M365_AUTHORITY_HOST;

    loadConfiguration();

    expect(() => {
      new M365TenantCredential();
    })
      .to.throw(
        ErrorWithCode,
        "clientId, clientSecret, certificateContent, tenantId in configuration is invalid: undefined."
      )
      .with.property("code", ErrorCode.InvalidConfiguration);

    process.env.M365_CLIENT_ID = clientId;
    loadConfiguration();

    expect(() => {
      new M365TenantCredential();
    })
      .to.throw(
        ErrorWithCode,
        "clientSecret, certificateContent, tenantId in configuration is invalid: undefined."
      )
      .with.property("code", ErrorCode.InvalidConfiguration);

    process.env.M365_TENANT_ID = tenantId;
    loadConfiguration();

    expect(() => {
      new M365TenantCredential();
    })
      .to.throw(
        ErrorWithCode,
        "clientSecret, certificateContent in configuration is invalid: undefined."
      )
      .with.property("code", ErrorCode.InvalidConfiguration);
  });

  it("getToken should success with valid config for Client Secret", async function () {
    sinon
      .stub(ClientSecretCredential.prototype, "getToken")
      .callsFake((): Promise<AccessToken | null> => {
        const token: AccessToken = {
          token: fakeToken,
          expiresOnTimestamp: Date.now() + 10 * 1000 * 60,
        };
        return new Promise((resolve) => {
          resolve(token);
        });
      });

    const credential = new M365TenantCredential();
    const token = await credential.getToken(scopes);
    assert.isNotNull(token);
    if (token) {
      assert.strictEqual(token.token, fakeToken);
    }

    sinon.restore();
  });

  it("getToken should success with valid config for Client Certificate", async function () {
    sinon
      .stub(ConfidentialClientApplication.prototype, "acquireTokenByClientCredential")
      .callsFake((): Promise<AuthenticationResult | null> => {
        const authResult: AuthenticationResult = {
          authority: "fake_authority",
          uniqueId: "fake_uniqueId",
          tenantId: "fake_tenant_id",
          scopes: [],
          account: null,
          idToken: "fake_id_token",
          idTokenClaims: new Object(),
          accessToken: fakeToken,
          fromCache: false,
          tokenType: "fake_tokenType",
          expiresOn: new Date(),
        };
        return new Promise<AuthenticationResult>((resolve) => {
          resolve(authResult);
        });
      });

    loadConfiguration({
      authentication: {
        clientId: clientId,
        certificateContent: certificateContent,
        authorityHost: authorityHost,
        tenantId: tenantId,
      },
    });

    const credential = new M365TenantCredential();
    const token = await credential.getToken(scopes);
    assert.isNotNull(token);
    if (token) {
      assert.strictEqual(token.token, fakeToken);
    }

    sinon.restore();
  });

  it("getToken should throw ServiceError when authenticate failed", async function () {
    sinon
      .stub(ClientSecretCredential.prototype, "getToken")
      .callsFake((): Promise<AccessToken | null> => {
        throw new AuthenticationError(401, "Authentication failed");
      });

    const credential = new M365TenantCredential();

    const errorResult = await expect(credential.getToken(scopes)).to.eventually.be.rejectedWith(
      ErrorWithCode
    );

    assert.strictEqual(errorResult.code, ErrorCode.ServiceError);
    assert.include(errorResult.message, "Authentication failed");
    assert.include(errorResult.message, "status code 401");

    sinon.restore();
  });

  it("getToken should throw InternalError with unknown error", async function () {
    sinon
      .stub(ClientSecretCredential.prototype, "getToken")
      .callsFake((): Promise<AccessToken | null> => {
        throw new Error("Unknown error");
      });

    const credential = new M365TenantCredential();

    const errorResult = await expect(credential.getToken(scopes)).to.eventually.be.rejectedWith(
      ErrorWithCode
    );

    assert.strictEqual(errorResult.code, ErrorCode.InternalError);
    assert.include(errorResult.message, "Unknown error");

    sinon.restore();
  });

  it("getToken should throw InternalError when get empty access token", async function () {
    sinon
      .stub(ClientSecretCredential.prototype, "getToken")
      .callsFake((): Promise<AccessToken | null> => {
        return new Promise((resolve) => {
          resolve(null);
        });
      });

    const credential = new M365TenantCredential();

    await expect(credential.getToken(scopes))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.InternalError);

    sinon.restore();
  });
});

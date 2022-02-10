// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import * as sinon from "sinon";
import { M365TenantCredential } from "../../../src";
import { ErrorCode, ErrorWithCode } from "../../../src/core/errors";
import { AuthenticationResult, ConfidentialClientApplication } from "@azure/msal-node";

chaiUse(chaiPromises);

describe("M365TenantCredential Tests - Node", () => {
  const scopes = "fake_scope";
  const clientId = "fake_client_id";
  const tenantId = "fake_tenant_id";
  const clientSecret = "fake_client_secret";
  const certificateContent = `-----BEGIN PRIVATE KEY-----
fakeKey
-----END PRIVATE KEY-----
-----BEGIN CERTIFICATE-----
fakeCert
-----END CERTIFICATE-----`;
  const authorityHost = "https://fake_authority_host";
  const fakeToken = "fake_token";
  const authConfig = {
    clientId: clientId,
    clientSecret: clientSecret,
    tenantId: tenantId,
    authorityHost: authorityHost,
  };

  it("getToken should throw InvalidParameter error with invalid scopes", async function () {
    const invalidScopes: any = [new Error()];
    const credential = new M365TenantCredential(authConfig);
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
    const credential: any = new M365TenantCredential(authConfig);

    assert.strictEqual(credential.msalClient.config.auth.clientId, clientId);
    assert.strictEqual(credential.msalClient.config.auth.authority, authorityHost + "/" + tenantId);
    assert.strictEqual(credential.msalClient.config.auth.clientSecret, clientSecret);
  });

  it("create M365TenantCredential instance should success with valid config for Client Certificate", function () {
    const credential: any = new M365TenantCredential({
      clientId: clientId,
      certificateContent: certificateContent,
      authorityHost: authorityHost,
      tenantId: tenantId,
    });

    assert.strictEqual(credential.msalClient.config.auth.clientId, clientId);
    assert.strictEqual(credential.msalClient.config.auth.authority, authorityHost + "/" + tenantId);
    assert.strictEqual(
      credential.msalClient.config.auth.clientCertificate.thumbprint,
      "06BA994A93FF2138DC51E669EB284ABAB8112153" // thumbprint is calculated from certificate content "fakeCert"
    );
    assert.strictEqual(credential.msalClient.config.auth.clientSecret, "");
  });

  it("create M365TenantCredential instance should success and respect certificateContent when both Client Secret and Client Certificate are set", function () {
    const credential: any = new M365TenantCredential({
      clientId: clientId,
      clientSecret: clientSecret,
      certificateContent: certificateContent,
      authorityHost: authorityHost,
      tenantId: tenantId,
    });

    // certificateContent has higher priority than clientSecret
    assert.exists(credential.msalClient);
    assert.notExists(credential.clientSecretCredential);
  });

  it("create M365TenantCredential instance should throw InvalidConfiguration when configuration is not valid", function () {
    expect(() => {
      new M365TenantCredential({});
    })
      .to.throw(
        ErrorWithCode,
        "clientId, clientSecret or certificateContent, tenantId in configuration is invalid: undefined."
      )
      .with.property("code", ErrorCode.InvalidConfiguration);

    expect(() => {
      new M365TenantCredential({ clientId: clientId });
    })
      .to.throw(
        ErrorWithCode,
        "clientSecret or certificateContent, tenantId in configuration is invalid: undefined."
      )
      .with.property("code", ErrorCode.InvalidConfiguration);

    expect(() => {
      new M365TenantCredential({ tenantId: tenantId });
    })
      .to.throw(
        ErrorWithCode,
        "clientSecret or certificateContent in configuration is invalid: undefined."
      )
      .with.property("code", ErrorCode.InvalidConfiguration);
  });

  it("create M365TenantCredential instance should throw InvalidCertificate with invalid certificate", async function () {
    expect(() => {
      new M365TenantCredential({
        clientId: clientId,
        certificateContent: "invalid_certificate_content",
        authorityHost: authorityHost,
        tenantId: tenantId,
      });
    })
      .to.throw(
        ErrorWithCode,
        "The certificate content does not contain a PEM-encoded certificate."
      )
      .with.property("code", ErrorCode.InvalidCertificate);
  });

  it("getToken should success with valid config for Client Secret", async function () {
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

    const credential = new M365TenantCredential(authConfig);
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

    const credential = new M365TenantCredential({
      clientId: clientId,
      certificateContent: certificateContent,
      authorityHost: authorityHost,
      tenantId: tenantId,
    });
    const token = await credential.getToken(scopes);
    assert.isNotNull(token);
    if (token) {
      assert.strictEqual(token.token, fakeToken);
    }

    sinon.restore();
  });

  it("getToken should throw ServiceError when authenticate failed", async function () {
    sinon
      .stub(ConfidentialClientApplication.prototype, "acquireTokenByClientCredential")
      .callsFake((): Promise<AuthenticationResult | null> => {
        throw new Error("Authentication failed");
      });

    const credential = new M365TenantCredential(authConfig);

    const errorResult = await expect(credential.getToken(scopes)).to.eventually.be.rejectedWith(
      ErrorWithCode
    );

    assert.strictEqual(errorResult.code, ErrorCode.ServiceError);
    assert.include(errorResult.message, "Authentication failed");

    sinon.restore();
  });

  it("getToken should throw InternalError when get empty access token", async function () {
    sinon
      .stub(ConfidentialClientApplication.prototype, "acquireTokenByClientCredential")
      .callsFake((): Promise<AuthenticationResult | null> => {
        return new Promise((resolve) => {
          resolve(null);
        });
      });

    const credential = new M365TenantCredential(authConfig);

    await expect(credential.getToken(scopes))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.InternalError);

    sinon.restore();
  });
});

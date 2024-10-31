// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken } from "@azure/core-auth";
import { assert, expect, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import { TeamsUserCredential, TeamsUserCredentialAuthConfig } from "../../../src/index.browser";
import * as sinon from "sinon";
import { ErrorCode, ErrorWithCode } from "../../../src/core/errors";
import { AccountInfo, AuthenticationResult, PublicClientApplication } from "@azure/msal-browser";

chaiUse(chaiPromises);

describe("TeamsUserCredential Tests - Browser", () => {
  const sandbox = sinon.createSandbox();
  const clientId = "fake_client_id";
  const loginUrl = "https://fake_login_url";
  const authEndpoint = "fake_auth_endpoint";

  /** Fake sso token payload
   * {
   *  "oid": "fake-oid",
   *  "tid": "fake-tid",
   *  "name": "fake-name",
   *  "ver": "1.0",
   *  "exp": 1537234948,
   *  "upn": "fake-upn"
   *  }
   */
  const fakeSSOTokenV1 =
    // eslint-disable-next-line no-secrets/no-secrets
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvaWQiOiJmYWtlLW9pZCIsInRpZCI6ImZha2UtdGlkIiwibmFtZSI6ImZha2UtbmFtZSIsInZlciI6IjEuMCIsImV4cCI6MTUzNzIzNDk0OCwidXBuIjoiZmFrZS11cG4ifQ.zPxn7kxIX2MpIiQZ2NMimrPMo7Laalzy8pzGzyyvxFY";

  /** Fake sso token v2 payload
   * {
   *  "oid": "fake-oid",
   *  "tid": "fake-tid"
   *  "name": "fake-name",
   *  "ver": "2.0",
   *  "exp": 1537234948,
   *  "preferred_username": "fake-preferred_username"
   *  }
   */
  const fakeSSOTokenV2 =
    // eslint-disable-next-line no-secrets/no-secrets
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvaWQiOiJmYWtlLW9pZCIsInRpZCI6ImZha2UtdGlkIiwibmFtZSI6ImZha2UtbmFtZSIsInZlciI6IjIuMCIsImV4cCI6MTUzNzIzNDk0OCwicHJlZmVycmVkX3VzZXJuYW1lIjoiZmFrZS1wcmVmZXJyZWRfdXNlcm5hbWUifQ.q7r1WcrWfYRNsz2gXj8-hiTKjZVOIw6eTnZxSzcH3lg";

  /**
   * {
   * "oid": "fake-oid",
   *  "name": "fake-name",
   *  "ver": "1.0",
   *  "exp": 1537234948,
   *  "upn": "fake-upn",
   *  "tid": "fake-tid",
   *  "aud": "fake-aud"
     }
   */
  const fakeSSOTokenFull =
    // eslint-disable-next-line no-secrets/no-secrets
    "eyJhbGciOiJIUzI1NiJ9.eyJvaWQiOiJmYWtlLW9pZCIsIm5hbWUiOiJmYWtlLW5hbWUiLCJ2ZXIiOiIxLjAiLCJleHAiOjE1MzcyMzQ5NDgsInVwbiI6ImZha2UtdXBuIiwidGlkIjoiZmFrZS10aWQiLCJhdWQiOiJmYWtlLWF1ZCJ9.rLK5VlJK1FsGZJD0yb-ussSjl2Z4sSqG1Nhj7NqjNs4";

  const invalidSSOToken = "invalid-sso-token";

  const fakeAccessToken = "fake-access-token";
  const fakeAccessTokenFull = fakeSSOTokenFull;

  const fakeAuthCodeTokenResponse: AuthenticationResult = {
    authority: "fake-authority",
    uniqueId: "fake-uniqure-id",
    tenantId: "fake-tenant-id",
    scopes: ["user.read"],
    account: {} as unknown as AccountInfo,
    idToken: "fake-id-token",
    idTokenClaims: {},
    accessToken: fakeAccessTokenFull,
    fromCache: true,
    expiresOn: new Date(Date.now() + 10 * 60 * 1000),
    tokenType: "fake-token-type",
    correlationId: "fake-correlation-id",
  };

  const authConfig = {
    initiateLoginEndpoint: loginUrl,
    simpleAuthEndpoint: authEndpoint,
    clientId: clientId,
  };
  afterEach(async () => {
    sandbox.restore();
  });

  it("getToken and login should throw InvalidParameter error with invalid scope", async function () {
    const invalidScopes: any = [1];
    const credential = new TeamsUserCredential(authConfig);

    const errorResult = await expect(
      credential.getToken(invalidScopes)
    ).to.eventually.be.rejectedWith(ErrorWithCode);

    assert.strictEqual(
      errorResult.message,
      "The type of scopes is not valid, it must be string or string array"
    );
    assert.strictEqual(errorResult.code, ErrorCode.InvalidParameter);
  });

  it("getToken should failed when not running inside Teams", async function () {
    const credential = new TeamsUserCredential(authConfig);
    const errorResult = await expect(credential.getToken([])).to.eventually.be.rejectedWith(
      ErrorWithCode
    );
    assert.strictEqual(errorResult.code, ErrorCode.InternalError);
    assert.include(
      errorResult.message,
      "Initialize teams sdk failed due to not running inside Teams environment"
    );
  });

  it("getUserInfo should throw InternalError when get SSO token failed", async function () {
    sandbox
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        throw new ErrorWithCode(
          "Get SSO token failed with error: failed to get sso token",
          ErrorCode.InternalError
        );
      });

    const credential: TeamsUserCredential = new TeamsUserCredential(authConfig);

    await expect(credential.getUserInfo())
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.InternalError);
  });

  it("getUserInfo should throw InternalError when get empty SSO token", async function () {
    sandbox
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        throw new ErrorWithCode("SSO token is empty", ErrorCode.InternalError);
      });

    const credential: TeamsUserCredential = new TeamsUserCredential(authConfig);

    await expect(credential.getUserInfo())
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.InternalError);
  });

  it("getUserInfo should throw InternalError when sso token is invalid", async function () {
    sandbox
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        return new Promise((resolve) => {
          resolve({
            token: invalidSSOToken,
            expiresOnTimestamp: Date.now(),
          });
        });
      });

    const credential: TeamsUserCredential = new TeamsUserCredential(authConfig);

    await expect(credential.getUserInfo())
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.InternalError);
  });

  it("getUserInfo should success with valid config", async function () {
    const TeamsUserCredentialStub_GetToken = sandbox.stub(
      TeamsUserCredential.prototype,
      <any>"getSSOToken"
    );

    TeamsUserCredentialStub_GetToken.onCall(0).callsFake((): Promise<AccessToken | null> => {
      const token: AccessToken = {
        token: fakeSSOTokenV1,
        expiresOnTimestamp: Date.now(),
      };
      return new Promise((resolve) => {
        resolve(token);
      });
    });

    TeamsUserCredentialStub_GetToken.onCall(1).callsFake((): Promise<AccessToken | null> => {
      const token: AccessToken = {
        token: fakeSSOTokenV2,
        expiresOnTimestamp: Date.now(),
      };
      return new Promise((resolve) => {
        resolve(token);
      });
    });

    const credential: any = new TeamsUserCredential(authConfig);

    const userInfo1 = await credential.getUserInfo();
    assert.strictEqual(userInfo1.displayName, "fake-name");
    assert.strictEqual(userInfo1.objectId, "fake-oid");
    assert.strictEqual(userInfo1.tenantId, "fake-tid");
    assert.strictEqual(userInfo1.preferredUserName, "fake-upn");

    const userInfo2 = await credential.getUserInfo();
    assert.strictEqual(userInfo2.displayName, "fake-name");
    assert.strictEqual(userInfo2.objectId, "fake-oid");
    assert.strictEqual(userInfo2.tenantId, "fake-tid");
    assert.strictEqual(userInfo2.preferredUserName, "fake-preferred_username");
  });

  it("loadConfiguration should throw InvalidConfiguration when configuration is not valid", async function () {
    expect(() => {
      new TeamsUserCredential({
        initiateLoginEndpoint: loginUrl,
      } as TeamsUserCredentialAuthConfig);
    })
      .to.throw(ErrorWithCode, "clientId in configuration is invalid: undefined.")
      .with.property("code", ErrorCode.InvalidConfiguration);
  });

  it("get SSO token should success with valid config", async function () {
    sandbox
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        const token: AccessToken = {
          token: fakeSSOTokenV1,
          expiresOnTimestamp: Date.now() + 10 * 1000 * 60,
        };
        return new Promise((resolve) => {
          resolve(token);
        });
      });

    const credential = new TeamsUserCredential(authConfig);
    const ssoToken = await credential.getToken("");
    assert.isNotNull(ssoToken);
    if (ssoToken) {
      assert.strictEqual(ssoToken.token, fakeSSOTokenV1);
    }
  });

  it("getToken should success with acqureTokenSilent", async function () {
    sandbox
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        const token: AccessToken = {
          token: fakeSSOTokenFull,
          expiresOnTimestamp: Date.now() + 10 * 1000 * 60,
        };
        return new Promise((resolve) => {
          resolve(token);
        });
      });

    sandbox
      .stub(PublicClientApplication.prototype, <any>"getAccountByUsername")
      .callsFake((): AccountInfo | null => {
        return null;
      });

    sandbox
      .stub(PublicClientApplication.prototype, <any>"acquireTokenSilent")
      .callsFake((): Promise<AuthenticationResult> => {
        return new Promise((resolve) => {
          resolve(fakeAuthCodeTokenResponse);
        });
      });

    const credential: any = new TeamsUserCredential(authConfig);
    const scopeStr = "user.read";

    const accessToken = await credential.getToken(scopeStr);
    assert.isNotNull(accessToken);
    if (accessToken) {
      assert.strictEqual(accessToken.token, fakeSSOTokenFull);
    }
  });

  it("getToken should success with ssoSilent", async function () {
    sandbox
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        const token: AccessToken = {
          token: fakeSSOTokenFull,
          expiresOnTimestamp: Date.now() + 10 * 1000 * 60,
        };
        return new Promise((resolve) => {
          resolve(token);
        });
      });

    sandbox
      .stub(PublicClientApplication.prototype, <any>"getAccountByUsername")
      .callsFake((): AccountInfo | null => {
        throw new Error("Failed to get account.");
      });

    sandbox
      .stub(PublicClientApplication.prototype, <any>"ssoSilent")
      .callsFake((): Promise<AuthenticationResult> => {
        return new Promise((resolve) => {
          resolve(fakeAuthCodeTokenResponse);
        });
      });

    const credential: any = new TeamsUserCredential(authConfig);
    const scopeStr = "user.read";

    const accessToken = await credential.getToken(scopeStr);

    assert.isNotNull(accessToken);
    if (accessToken) {
      assert.strictEqual(accessToken.token, fakeSSOTokenFull);
    }
  });

  it("getToken should throw UiRequiredError without login", async function () {
    sandbox
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        const token: AccessToken = {
          token: fakeSSOTokenFull,
          expiresOnTimestamp: Date.now() + 10 * 1000 * 60,
        };
        return new Promise((resolve) => {
          resolve(token);
        });
      });

    sandbox
      .stub(PublicClientApplication.prototype, <any>"getAccountByUsername")
      .callsFake((): AccountInfo | null => {
        throw new Error("Failed to get account.");
      });

    sandbox
      .stub(PublicClientApplication.prototype, <any>"ssoSilent")
      .callsFake((): Promise<AuthenticationResult> => {
        return new Promise((resolve) => {
          throw new Error("Failed to call ssoSilent.");
        });
      });

    const credential: any = new TeamsUserCredential(authConfig);
    const scopeStr = "user.read";

    await expect(credential.getToken(scopeStr))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.UiRequiredError);
  });

  it("getToken should success with login", async function () {
    sandbox
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        const token: AccessToken = {
          token: fakeSSOTokenFull,
          expiresOnTimestamp: Date.now() + 10 * 1000 * 60,
        };
        return new Promise((resolve) => {
          resolve(token);
        });
      });

    const credential: any = new TeamsUserCredential(authConfig);
    const scopeStr = "user.read";

    sandbox
      .stub(TeamsUserCredential.prototype, <any>"login")
      .callsFake(async (): Promise<AccessToken | null> => {
        return new Promise((resolve) => {
          resolve({
            token: fakeAccessToken,
            expiresOnTimestamp: Date.now() + 10 * 1000 * 60,
          });
        });
      });

    const accessToken = await credential.login(scopeStr);

    assert.isNotNull(accessToken);
    if (accessToken) {
      assert.strictEqual(accessToken.token, fakeAccessToken);
    }
  });
});

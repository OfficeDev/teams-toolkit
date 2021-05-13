// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken } from "@azure/core-auth";
import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { loadConfiguration, TeamsUserCredential } from "../../../src";
import sinon from "sinon";
import { ErrorCode, ErrorMessage, ErrorWithCode } from "../../../src/core/errors";

chaiUse(chaiPromises);

describe("TeamsUserCredential Tests - Browser", () => {
  const token = "fake_access_token";
  const scopes = "fake_scope";
  const userId = "fake_user";
  const tenantId = "fake_tenant_id";
  const clientId = "fake_client_id";
  const loginUrl = "fake_login_url";
  const authEndpoint = "fake_auth_endpoint";

  /** Fake sso token payload
   * {
   *  "oid": "fake-oid",
   *  "name": "fake-name",
   *  "ver": "1.0",
   *  "exp": 1537234948,
   *  "upn": "fake-upn"
   *  }
   */
  const fakeSSOTokenV1 =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvaWQiOiJmYWtlLW9pZCIsIm5hbWUiOiJmYWtlLW5hbWUiLCJ2ZXIiOiIxLjAiLCJleHAiOjE1MzcyMzQ5NDgsInVwbiI6ImZha2UtdXBuIn0.0CpibI3xSKj6y7bLIT6LjESASq3J2_uRnkPT5eKvWc0";

  /** Fake sso token v2 payload
   * {
   *  "oid": "fake-oid",
   *  "name": "fake-name",
   *  "ver": "2.0",
   *  "exp": 1537234948,
   *  "preferred_username": "fake-preferred_username"
   *  }
   */
  const fakeSSOTokenV2 =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvaWQiOiJmYWtlLW9pZCIsIm5hbWUiOiJmYWtlLW5hbWUiLCJ2ZXIiOiIyLjAiLCJleHAiOjE1MzcyMzQ5NDgsInByZWZlcnJlZF91c2VybmFtZSI6ImZha2UtcHJlZmVycmVkX3VzZXJuYW1lIn0.CJ_cSeXhNZeilPWJvznNlGULAkHpITfiPPeHgaPzfH4";

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
    "eyJhbGciOiJIUzI1NiJ9.eyJvaWQiOiJmYWtlLW9pZCIsIm5hbWUiOiJmYWtlLW5hbWUiLCJ2ZXIiOiIxLjAiLCJleHAiOjE1MzcyMzQ5NDgsInVwbiI6ImZha2UtdXBuIiwidGlkIjoiZmFrZS10aWQiLCJhdWQiOiJmYWtlLWF1ZCJ9.rLK5VlJK1FsGZJD0yb-ussSjl2Z4sSqG1Nhj7NqjNs4";

  const invalidSSOToken = "invalid-sso-token";

  const fakeAccessToken = "fake-access-token";

  function loadDefaultConfig() {
    loadConfiguration({
      authentication: {
        initiateLoginEndpoint: loginUrl,
        simpleAuthEndpoint: authEndpoint,
        clientId: clientId,
      },
    });
  }

  it("getToken and login should throw InvalidParameter error with invalid scope", async function () {
    loadDefaultConfig();
    const invalidScopes: any = [1];
    const credential = new TeamsUserCredential();

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
    this.timeout(10000);
    loadDefaultConfig();
    const credential = new TeamsUserCredential();
    const errorResult = await expect(credential.getToken([])).to.eventually.be.rejectedWith(
      ErrorWithCode
    );
    assert.strictEqual(errorResult.code, ErrorCode.InternalError);
    assert.include(
      errorResult.message,
      "Initialize teams sdk timeout, maybe the code is not running inside Teams"
    );
  });

  it("getTokenCache should success with valid config", async function () {
    const expiresOnTimestamp: number = Date.now() + 10 * 60 * 1000;
    const accessToken: AccessToken = {
      token,
      expiresOnTimestamp,
    };

    loadDefaultConfig();
    const credential: any = new TeamsUserCredential();

    const key = credential.getAccessTokenCacheKey(userId, clientId, tenantId, scopes);
    credential.setTokenCache(key, accessToken);
    const accessTokenFromCache = credential.getTokenCache(key);

    assert.isNotNull(accessTokenFromCache);
    if (accessTokenFromCache) {
      assert.strictEqual(accessTokenFromCache.token, accessToken.token);
      assert.strictEqual(accessTokenFromCache.expiresOnTimestamp, accessToken.expiresOnTimestamp);
    }
  });

  it("isAccessTokenNearExpired should return true when token is nearly expired", async function () {
    const expiresOnTimestamp: number = Date.now();
    const accessToken: AccessToken = {
      token,
      expiresOnTimestamp,
    };

    loadDefaultConfig();
    const credential: any = new TeamsUserCredential();

    const key = credential.getAccessTokenCacheKey(userId, clientId, tenantId, scopes);

    credential.setTokenCache(key, accessToken);

    const accessTokenFromCache = credential.getTokenCache(key);

    assert.isNotNull(accessTokenFromCache);
    if (accessTokenFromCache) {
      const isNearExpired = credential.isAccessTokenNearExpired(
        accessTokenFromCache.expiresOnTimestamp
      );
      assert.isTrue(isNearExpired);
    }
  });

  it("getUserInfo should throw InternalError when get SSO token failed", async function () {
    sinon
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        throw new ErrorWithCode(
          "Get SSO token failed with error: failed to get sso token",
          ErrorCode.InternalError
        );
      });

    loadDefaultConfig();
    const credential: TeamsUserCredential = new TeamsUserCredential();

    await expect(credential.getUserInfo())
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.InternalError);

    sinon.restore();
  });

  it("getUserInfo should throw InternalError when get empty SSO token", async function () {
    sinon
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        throw new ErrorWithCode("SSO token is empty", ErrorCode.InternalError);
      });

    loadDefaultConfig();
    const credential: TeamsUserCredential = new TeamsUserCredential();

    await expect(credential.getUserInfo())
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.InternalError);

    sinon.restore();
  });

  it("getUserInfo should throw InternalError when sso token is invalid", async function () {
    sinon
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        return new Promise((resolve) => {
          resolve({
            token: invalidSSOToken,
            expiresOnTimestamp: Date.now(),
          });
        });
      });

    loadDefaultConfig();
    const credential: TeamsUserCredential = new TeamsUserCredential();

    await expect(credential.getUserInfo())
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.InternalError);

    sinon.restore();
  });

  it("getUserInfo should success with valid config", async function () {
    const TeamsUserCredentialStub_GetToken = sinon.stub(
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

    loadDefaultConfig();
    const credential: any = new TeamsUserCredential();

    const userInfo1 = await credential.getUserInfo();
    assert.strictEqual(userInfo1.displayName, "fake-name");
    assert.strictEqual(userInfo1.objectId, "fake-oid");
    assert.strictEqual(userInfo1.preferredUserName, "fake-upn");

    const userInfo2 = await credential.getUserInfo();
    assert.strictEqual(userInfo2.displayName, "fake-name");
    assert.strictEqual(userInfo2.objectId, "fake-oid");
    assert.strictEqual(userInfo2.preferredUserName, "fake-preferred_username");

    sinon.restore();
  });

  it("loadConfiguration should throw InvalidConfiguration when configuration is not valid", async function () {
    loadConfiguration({
      authentication: undefined,
    });

    expect(() => {
      new TeamsUserCredential();
    })
      .to.throw(ErrorWithCode, ErrorMessage.AuthenticationConfigurationNotExists)
      .with.property("code", ErrorCode.InvalidConfiguration);

    loadConfiguration({
      authentication: {
        simpleAuthEndpoint: authEndpoint,
      },
    });

    expect(() => {
      new TeamsUserCredential();
    })
      .to.throw(
        ErrorWithCode,
        "initiateLoginEndpoint, clientId in configuration is invalid: undefined."
      )
      .with.property("code", ErrorCode.InvalidConfiguration);

    loadConfiguration({
      authentication: {
        initiateLoginEndpoint: loginUrl,
      },
    });

    expect(() => {
      new TeamsUserCredential();
    })
      .to.throw(ErrorWithCode, "clientId in configuration is invalid: undefined.")
      .with.property("code", ErrorCode.InvalidConfiguration);
  });

  it("get SSO token should success with valid config", async function () {
    sinon
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

    loadDefaultConfig();
    const credential = new TeamsUserCredential();
    const ssoToken = await credential.getToken("");
    assert.isNotNull(ssoToken);
    if (ssoToken) {
      assert.strictEqual(ssoToken.token, fakeSSOTokenV1);
    }

    sinon.restore();
  });

  it("getToken should success with local token cache", async function () {
    sinon
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

    loadDefaultConfig();
    const credential: any = new TeamsUserCredential();
    const scopeStr = "user.read";
    const cacheKey = await credential.getAccessTokenCacheKey(scopeStr);
    sinon
      .stub(TeamsUserCredential.prototype, <any>"getTokenCache")
      .callsFake((key: string): AccessToken | null => {
        if (key === cacheKey) {
          return {
            token: fakeAccessToken,
            expiresOnTimestamp: Date.now() + 10 * 60 * 1000,
          };
        }

        return null;
      });

    const accessToken = await credential.getToken(scopeStr);
    assert.isNotNull(accessToken);
    if (accessToken) {
      assert.strictEqual(accessToken.token, fakeAccessToken);
    }

    sinon.restore();
  });

  it("getToken should success with token cache from remote server", async function () {
    sinon
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

    loadDefaultConfig();
    const credential: any = new TeamsUserCredential();
    const scopeStr = "user.read";
    sinon
      .stub(TeamsUserCredential.prototype, <any>"getAndCacheAccessTokenFromSimpleAuthServer")
      .callsFake(async (): Promise<AccessToken> => {
        return new Promise((resolve) => {
          resolve({
            token: fakeAccessToken,
            expiresOnTimestamp: Date.now() + 10 * 60 * 1000,
          });
        });
      });

    const accessToken = await credential.getToken(scopeStr);

    assert.isNotNull(accessToken);
    if (accessToken) {
      assert.strictEqual(accessToken.token, fakeAccessToken);
    }

    sinon.restore();
  });

  it("getToken should throw UiRequiredError without login", async function () {
    sinon
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

    loadDefaultConfig();
    const credential: any = new TeamsUserCredential();
    const scopeStr = "user.read";
    sinon
      .stub(TeamsUserCredential.prototype, <any>"getAndCacheAccessTokenFromSimpleAuthServer")
      .callsFake(async (): Promise<AccessToken> => {
        throw new ErrorWithCode(
          `Failed to get access token cache from authentication server, please login first: you need login first before get access token`,
          ErrorCode.UiRequiredError
        );
      });

    await expect(credential.getToken(scopeStr))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.UiRequiredError);

    sinon.restore();
  });

  it("getToken should success after login", async function () {
    sinon
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

    loadDefaultConfig();
    const credential: any = new TeamsUserCredential();
    const scopeStr = "user.read";

    sinon.stub(TeamsUserCredential.prototype, <any>"login").callsFake(async (): Promise<void> => {
      const key = await credential.getAccessTokenCacheKey(scopeStr);
      credential.setTokenCache(key, {
        token: fakeAccessToken,
        expiresOnTimestamp: Date.now() + 10 * 1000 * 60,
      });
    });

    await credential.login(scopeStr);
    const accessToken = await credential.getToken(scopeStr);

    assert.isNotNull(accessToken);
    if (accessToken) {
      assert.strictEqual(accessToken.token, fakeAccessToken);
    }

    sinon.restore();
  });
});

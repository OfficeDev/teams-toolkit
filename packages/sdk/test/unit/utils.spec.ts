// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AuthenticationResult } from "@azure/msal-browser";
import { assert, expect } from "chai";
import { ErrorWithCode, ErrorCode } from "../../src/core/errors";
import {
  validateScopesType,
  parseAccessTokenFromAuthCodeTokenResponse,
  getTenantIdAndLoginHintFromSsoToken,
} from "../../src/util/utils";

describe("Utils Tests", () => {
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

  function getAuthCodeTokenResponse(accessToken: string): AuthenticationResult {
    return {
      authority: "fake-authority",
      uniqueId: "fake-uniqure-id",
      tenantId: "fake-tenant-id",
      scopes: ["user.read"],
      account: null,
      idToken: "fake-id-token",
      idTokenClaims: {},
      accessToken: accessToken,
      fromCache: true,
      expiresOn: new Date(Date.now() + 10 * 60 * 1000),
      tokenType: "fake-token-type",
      correlationId: "fake-correlation-id",
    };
  }

  it("validateScopesType should throw InvalidParameter error with invalid scopes", () => {
    const invalidScopes = [1, 2];
    const expectedErrorMsg = "The type of scopes is not valid, it must be string or string array";
    expect(() => {
      validateScopesType(invalidScopes);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes2 = new Promise((resolve) => resolve(true));
    expect(() => {
      validateScopesType(invalidScopes2);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes3 = 1;
    expect(() => {
      validateScopesType(invalidScopes3);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes4 = { scopes: "user.read" };
    expect(() => {
      validateScopesType(invalidScopes4);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes5 = true;
    expect(() => {
      validateScopesType(invalidScopes5);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes6: any = null;
    expect(() => {
      validateScopesType(invalidScopes6);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);

    const invalidScopes7: any = undefined;
    expect(() => {
      validateScopesType(invalidScopes7);
    })
      .to.throw(ErrorWithCode, expectedErrorMsg)
      .with.property("code", ErrorCode.InvalidParameter);
  });

  it("validateScopesType should success with valid scopes", () => {
    const validScopes1 = "https://graph.microsoft.com/user.read";
    validateScopesType(validScopes1);

    const validScopes2 = ["user.read", "user.write"];
    validateScopesType(validScopes2);

    const validScopes3: string[] = [];
    validateScopesType(validScopes3);

    const validScopes4 = "";
    validateScopesType(validScopes4);
  });

  it("parseAccessTokenFromAuthCodeTokenResponse should success when parameter is string type", () => {
    const tokenResponse = JSON.stringify(getAuthCodeTokenResponse(fakeSSOTokenFull));
    const accessToken = parseAccessTokenFromAuthCodeTokenResponse(tokenResponse);

    assert.isNotNull(accessToken);
    if (accessToken) {
      assert.strictEqual(accessToken.token, fakeSSOTokenFull);
    }
  });

  it("parseAccessTokenFromAuthCodeTokenResponse should success when parameter is AuthenticationResult type", () => {
    const accessToken = parseAccessTokenFromAuthCodeTokenResponse(
      getAuthCodeTokenResponse(fakeSSOTokenFull)
    );

    assert.isNotNull(accessToken);
    if (accessToken) {
      assert.strictEqual(accessToken.token, fakeSSOTokenFull);
    }
  });

  it("parseAccessTokenFromAuthCodeTokenResponse throw InternalError with empty access token", () => {
    const errorMsg = "Get empty access token from Auth Code token response.";
    expect(() => {
      parseAccessTokenFromAuthCodeTokenResponse(getAuthCodeTokenResponse(""));
    })
      .to.throw(ErrorWithCode, errorMsg)
      .with.property("code", ErrorCode.InternalError);
  });

  it("getTenantIdAndLoginHintFromSsoToken should success with valid sso token", () => {
    const userInfo = getTenantIdAndLoginHintFromSsoToken(fakeSSOTokenFull);
    assert.isNotNull(userInfo);
    if (userInfo) {
      assert.strictEqual(userInfo.tid, "fake-tid");
      assert.strictEqual(userInfo.loginHint, "fake-upn");
    }
  });

  it("getTenantIdAndLoginHintFromSsoToken throw InvalidParameter with empty sso token", () => {
    const errorMsg = "SSO token is undefined.";
    expect(() => {
      getTenantIdAndLoginHintFromSsoToken("");
    })
      .to.throw(ErrorWithCode, errorMsg)
      .with.property("code", ErrorCode.InvalidParameter);
  });
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { assert, expect } from "chai";
import { ErrorWithCode, ErrorCode } from "../../src/core/errors";
import {
  validateScopesType,
  parseAccessTokenFromAuthCodeTokenResponse,
  getTenantIdAndLoginHintFromSsoToken,
  parseJwt,
  validateConfig,
} from "../../src/util/utils";

describe("Utils Tests", () => {
  /**
   * {
   *  oid: "fake-oid",
   *  name: "fake-name",
   *  ver: "1.0",
   *  exp: 1537234948,
   *  upn: "fake-upn",
   *  tid: "fake-tid",
   *  aud: "fake-aud",
   *  iss: "fake-iss",
   *  iat: 1537234948,
   *  nbf: 1537234948,
   *  aio: "fake-aio",
   *  rh: "fake-rh",
   *  scp: "fake-scp",
   *  sub: "fake-sub",
   *  uti: "fake-uti",
   * }
   **/

  const fakeSSOTokenFull =
    // eslint-disable-next-line no-secrets/no-secrets
    "eyJhbGciOiJIUzI1NiJ9.eyJvaWQiOiJmYWtlLW9pZCIsIm5hbWUiOiJmYWtlLW5hbWUiLCJ2ZXIiOiIxLjAiLCJleHAiOjE1MzcyMzQ5NDgsInVwbiI6ImZha2UtdXBuIiwidGlkIjoiZmFrZS10aWQiLCJhdWQiOiJmYWtlLWF1ZCIsImlzcyI6ImZha2UtaXNzIiwiaWF0IjoxNTM3MjM0OTQ4LCJuYmYiOjE1MzcyMzQ5NDgsImFpbyI6ImZha2UtYWlvIiwicmgiOiJmYWtlLXJoIiwic2NwIjoiZmFrZS1zY3AiLCJzdWIiOiJmYWtlLXN1YiIsInV0aSI6ImZha2UtdXRpIn0.nTgx3IdZR-hqFSUiVwFx0L4kZxMPQ0sk-xI_UgexAGw";

  function getAuthCodeTokenResponse(accessToken: string): AuthenticationResult {
    return {
      authority: "fake-authority",
      uniqueId: "fake-uniqure-id",
      tenantId: "fake-tenant-id",
      scopes: ["user.read"],
      account: {} as unknown as AccountInfo,
      idToken: "fake-id-token",
      idTokenClaims: {},
      accessToken: accessToken,
      fromCache: true,
      expiresOn: new Date(Date.now() + 10 * 60 * 1000),
      tokenType: "fake-token-type",
      correlationId: "fake-correlation-id",
    };
  }

  describe("parseJwt()", () => {
    it("should correctly parse a valid JWT token", () => {
      const expectedPayload = {
        oid: "fake-oid",
        name: "fake-name",
        ver: "1.0",
        exp: 1537234948,
        upn: "fake-upn",
        tid: "fake-tid",
        aud: "fake-aud",
        iss: "fake-iss",
        iat: 1537234948,
        nbf: 1537234948,
        aio: "fake-aio",
        rh: "fake-rh",
        scp: "fake-scp",
        sub: "fake-sub",
        uti: "fake-uti",
      };

      const decodedPayload = parseJwt(fakeSSOTokenFull);

      assert.deepEqual(decodedPayload, expectedPayload);
    });

    it("should throw an error for an invalid JWT token", () => {
      // decoded - {}
      // eslint-disable-next-line no-secrets/no-secrets
      const invalidToken = "eyJhbGciOiJIUzI1NiJ9.e30.ZRrHA1JJJW8opsbCGfG_HACGpVUMN_a9IV7pAx_Zmeo";

      try {
        parseJwt(invalidToken);
      } catch (error) {
        if (error instanceof Error) {
          assert.equal(
            error.message,
            "Parse jwt token failed in node env with error: Decoded token is null or exp claim does not exists."
          );
          assert.equal(error.name, "ErrorWithCode.InternalError");
        }
      }
    });
  });

  describe("validateScopesType()", () => {
    it("should throw InvalidParameter error with invalid scopes", () => {
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

      const invalidScopes6 = null;
      expect(() => {
        validateScopesType(invalidScopes6);
      })
        .to.throw(ErrorWithCode, expectedErrorMsg)
        .with.property("code", ErrorCode.InvalidParameter);

      const invalidScopes7 = undefined;
      expect(() => {
        validateScopesType(invalidScopes7);
      })
        .to.throw(ErrorWithCode, expectedErrorMsg)
        .with.property("code", ErrorCode.InvalidParameter);
    });

    it("should success with valid scopes", () => {
      const validScopes1 = "https://graph.microsoft.com/user.read";
      validateScopesType(validScopes1);

      const validScopes2 = ["user.read", "user.write"];
      validateScopesType(validScopes2);

      const validScopes3: string[] = [];
      validateScopesType(validScopes3);

      const validScopes4 = "";
      validateScopesType(validScopes4);
    });
  });

  describe("parseAccessTokenFromAuthCodeTokenResponse()", () => {
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
  });

  describe("getTenantIdAndLoginHintFromSsoToken()", () => {
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

  describe("validateConfig", () => {
    it("should pass with valid config using clientSecret", () => {
      const config = {
        authorityHost: "https://login.microsoftonline.com",
        clientId: "valid-client-id",
        tenantId: "valid-tenant-id",
        clientSecret: "valid-client-secret",
      };
      assert.doesNotThrow(() => validateConfig(config));
    });

    it("should pass with valid config using certificateContent", () => {
      const config = {
        authorityHost: "https://login.microsoftonline.com",
        clientId: "valid-client-id",
        tenantId: "valid-tenant-id",
        certificateContent: "valid-certificate-content",
      };
      assert.doesNotThrow(() => validateConfig(config));
    });

    it("should throw error if clientId is missing", () => {
      const config = {
        authorityHost: "https://login.microsoftonline.com",
        tenantId: "valid-tenant-id",
        clientSecret: "valid-client-secret",
      };
      assert.throw(
        () => validateConfig(config),
        "clientId in configuration is invalid: undefined."
      );
    });

    it("should throw error if both clientSecret and certificateContent are missing", () => {
      const config = {
        authorityHost: "https://login.microsoftonline.com",
        clientId: "valid-client-id",
        tenantId: "valid-tenant-id",
      };
      assert.throw(
        () => validateConfig(config),
        "clientSecret or certificateContent in configuration is invalid: undefined."
      );
    });

    it("should throw error if tenantId is missing", () => {
      const config = {
        authorityHost: "https://login.microsoftonline.com",
        clientId: "valid-client-id",
        clientSecret: "valid-client-secret",
      };
      assert.throw(
        () => validateConfig(config),
        "tenantId in configuration is invalid: undefined."
      );
    });

    it("should throw error if authorityHost is missing", () => {
      const config = {
        clientId: "valid-client-id",
        tenantId: "valid-tenant-id",
        clientSecret: "valid-client-secret",
      };
      assert.throw(
        () => validateConfig(config),
        "authorityHost in configuration is invalid: undefined."
      );
    });
  });
});

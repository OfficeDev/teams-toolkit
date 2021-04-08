// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import {
  Configuration,
  ErrorCode,
  ErrorWithCode,
  loadConfiguration,
  OnBehalfOfUserCredential
} from "../../../../src";
import sinon from "sinon";
import mockedEnv from "mocked-env";
import {
  AuthenticationResult,
  ConfidentialClientApplication,
  OnBehalfOfRequest
} from "@azure/msal-node";

chaiUse(chaiPromises);
let mockedEnvRestore: () => void;

describe("OnBehalfOfUserCredential - node", () => {
  const ssoToken = "fake_sso_token";
  const scopes = "fake_scope";
  const userId = "fake_user";
  const tenantId = "fake_tenant_id";
  const clientId = "fake_client_id";
  const clientSecret = "fake_client_secret";
  const initiateLoginEndpoint = "fake_initiate_login_endpoint";
  const authorityHost = "fake_authority_host";

  // Error code
  const InvalidConfiguration = "InvalidConfiguration";

  /**
   * {
   * "aud": "test_audience",
   * "iss": "https://login.microsoftonline.com/test_aad_id/v2.0",
   * "iat": 1537231048,
   * "nbf": 1537231048,
   * "exp": 1537234948,
   * "aio": "test_aio",
   * "name": "Teams App Framework SDK Unit Test",
   * "oid": "11111111-2222-3333-4444-555555555555",
   * "preferred_username": "test@microsoft.com",
   * "rh": "test_rh",
   * "scp": "access_as_user",
   * "sub": "test_sub",
   * "tid": "test_tenant_id",
   * "uti": "test_uti",
   * "ver": "2.0"
   * }
   */
  const ssoToken1 =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ0ZXN0X2F1ZGllbmNlIiwiaXNzIjoiaHR0cHM6Ly9sb2dpbi5taWNyb3NvZnRvbmxpbmUuY29tL3Rlc3RfYWFkX2lkL3YyLjAiLCJpYXQiOjE1MzcyMzEwNDgsIm5iZiI6MTUzNzIzMTA0OCwiZXhwIjoxNTM3MjM0OTQ4LCJhaW8iOiJ0ZXN0X2FpbyIsIm5hbWUiOiJNT0RTIFRvb2xraXQgU0RLIFVuaXQgVGVzdCIsIm9pZCI6IjExMTExMTExLTIyMjItMzMzMy00NDQ0LTU1NTU1NTU1NTU1NSIsInByZWZlcnJlZF91c2VybmFtZSI6InRlc3RAbWljcm9zb2Z0LmNvbSIsInJoIjoidGVzdF9yaCIsInNjcCI6ImFjY2Vzc19hc191c2VyIiwic3ViIjoidGVzdF9zdWIiLCJ0aWQiOiJ0ZXN0X3RlbmFudF9pZCIsInV0aSI6InRlc3RfdXRpIiwidmVyIjoiMi4wIn0.SshbL1xuE1aNZD5swrWOQYgTR9QCNXkZqUebautBvKM";
  const ssoTokenExpiration = "2018-09-18T01:42:28.000Z";

  /** Fake sso token payload
   * {
   *  "oid": "fake-oid",
   *  "name": "fake-name",
   *  "ver": "1.0",
   *  "upn": "fake-upn"
   *  }
   */
  const fakeSSOTokenV1 =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvaWQiOiJmYWtlLW9pZCIsIm5hbWUiOiJmYWtlLW5hbWUiLCJ2ZXIiOiIxLjAiLCJ1cG4iOiJmYWtlLXVwbiJ9.hztwdsbSQAYWthch_n2V21r4tIPBp22e6Xh_ATbOzWQ";

  /** Fake sso token v2 payload
   * {
   *  "oid": "fake-oid",
   *  "name": "fake-name",
   *  "ver": "2.0",
   *  "preferred_username": "fake-preferred_username"
   *  }
   */
  const fakeSSOTokenV2 =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvaWQiOiJmYWtlLW9pZCIsIm5hbWUiOiJmYWtlLW5hbWUiLCJ2ZXIiOiIyLjAiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJmYWtlLXByZWZlcnJlZF91c2VybmFtZSJ9.h8NmD0OZGWbyIuTanHoehLMDOhwxD17mp2-MKuLo4QI";

  /**
   * {
   * "oid": "fake-oid",
   *  "name": "fake-name",
   *  "ver": "1.0",
   *  "upn": "fake-upn",
   *  "tid": "fake-tid",
   *  "aud": "fake-aud"
     }
   */
  const fakeSSOTokenFull =
    "eyJhbGciOiJIUzI1NiJ9.eyJvaWQiOiJmYWtlLW9pZCIsIm5hbWUiOiJmYWtlLW5hbWUiLCJ2ZXIiOiIxLjAiLCJ1cG4iOiJmYWtlLXVwbiIsInRpZCI6ImZha2UtdGlkIiwiYXVkIjoiZmFrZS1hdWQifQ.1zHw8mK44l4iu1zlHvOGd6R7YZDBtEtmtDugpVZEyEA";

  const sandbox = sinon.createSandbox();

  beforeEach(function() {
    // Mock ConfidentialClientApplication implementation
    const cca_acquireTokenOnBehalfOf = sandbox
      .stub(ConfidentialClientApplication.prototype, "acquireTokenOnBehalfOf")
      .callsFake(
        (request: OnBehalfOfRequest): Promise<AuthenticationResult | null> => {
          const authResult: AuthenticationResult = {
            authority: "fake_authority",
            uniqueId: "fake_uniqueId",
            tenantId: "fake_tenant_id",
            scopes: [],
            account: null,
            idToken: "fake_id_token",
            idTokenClaims: new Object(),
            accessToken: "fake_access_token",
            fromCache: false,
            tokenType: "fake_tokenType",
            expiresOn: new Date()
          };
          return new Promise<AuthenticationResult>((resolve) => {
            resolve(authResult);
          });
        }
      );
  });

  afterEach(function() {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("construct OnBehalfOfUserCredential should throw InvalidConfiguration Error when clientId not found", async function() {
    mockedEnvRestore = mockedEnv({
      M365_CLIENT_SECRET: clientSecret,
      M365_AUTHORITY_HOST: authorityHost
    });
    loadConfiguration();

    expect(() => {
      new OnBehalfOfUserCredential(ssoToken);
    })
      .to.throw(ErrorWithCode, "clientId in configuration is invalid: undefined")
      .with.property("code", InvalidConfiguration);
  });

  it("construct OnBehalfOfUserCredential should throw InvalidConfiguration Error when authorityHost not found", async function() {
    mockedEnvRestore = mockedEnv({
      M365_CLIENT_ID: clientId,
      M365_CLIENT_SECRET: clientSecret
    });
    loadConfiguration();

    expect(() => {
      new OnBehalfOfUserCredential(ssoToken);
    })
      .to.throw(ErrorWithCode, "authorityHost in configuration is invalid: undefined")
      .with.property("code", InvalidConfiguration);
  });

  it("construct OnBehalfOfUserCredential should throw InvalidConfiguration Error when clientSecret not found", async function() {
    mockedEnvRestore = mockedEnv({
      M365_CLIENT_ID: clientId,
      M365_AUTHORITY_HOST: authorityHost
    });
    loadConfiguration();

    expect(() => {
      new OnBehalfOfUserCredential(ssoToken);
    })
      .to.throw(ErrorWithCode, "clientSecret in configuration is invalid: undefined")
      .with.property("code", InvalidConfiguration);
  });

  it("construct OnBehalfOfUserCredential should throw InvalidConfiguration Error when clientId, clientSecret, authorityHost not found", async function() {
    loadConfiguration();

    expect(() => {
      new OnBehalfOfUserCredential(ssoToken);
    })
      .to.throw(
        ErrorWithCode,
        "clientId, authorityHost, clientSecret in configuration is invalid: undefined"
      )
      .with.property("code", InvalidConfiguration);
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  it("should get sso token when scopes is empty string", async function() {});
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  it("should get sso token when scopes is empty array", async function() {});
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  it("should get access token when scopes is string", async function() {});
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  it("should get access token when scopes is string array", async function() {});

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  it("should throw GetAccessTokenOnBehalfOfUserFailed Error with invalid SSO token", async function() {});
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  it("should throw GetAccessTokenOnBehalfOfUserFailed Error when fail to get access token due to AAD outage", async function() {});
});

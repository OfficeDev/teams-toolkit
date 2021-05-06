// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import mockedEnv from "mocked-env";
import {
  loadConfiguration,
  OnBehalfOfUserCredential,
  M365TenantCredential,
  MsGraphAuthProvider,
  ErrorWithCode,
  ErrorCode
} from "../../../src";
import sinon from "sinon";
import { AccessToken } from "@azure/core-http";

chaiUse(chaiPromises);
let mockedEnvRestore: () => void;

describe("MsGraphAuthProvider Tests - Node", () => {
  const scopes = "fake_scope";
  const clientId = "fake_client_id";
  const clientSecret = "fake_client_secret";
  const tenantId = "fake_tenant";
  const authorityHost = "https://fake_authority_host";
  const initiateLoginEndpoint = "fake_initiate_login_endpoint";

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
  const ssoToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ0ZXN0X2F1ZGllbmNlIiwiaXNzIjoiaHR0cHM6Ly9sb2dpbi5taWNyb3NvZnRvbmxpbmUuY29tL3Rlc3RfYWFkX2lkL3YyLjAiLCJpYXQiOjE1MzcyMzEwNDgsIm5iZiI6MTUzNzIzMTA0OCwiZXhwIjoxNTM3MjM0OTQ4LCJhaW8iOiJ0ZXN0X2FpbyIsIm5hbWUiOiJNT0RTIFRvb2xraXQgU0RLIFVuaXQgVGVzdCIsIm9pZCI6IjExMTExMTExLTIyMjItMzMzMy00NDQ0LTU1NTU1NTU1NTU1NSIsInByZWZlcnJlZF91c2VybmFtZSI6InRlc3RAbWljcm9zb2Z0LmNvbSIsInJoIjoidGVzdF9yaCIsInNjcCI6ImFjY2Vzc19hc191c2VyIiwic3ViIjoidGVzdF9zdWIiLCJ0aWQiOiJ0ZXN0X3RlbmFudF9pZCIsInV0aSI6InRlc3RfdXRpIiwidmVyIjoiMi4wIn0.SshbL1xuE1aNZD5swrWOQYgTR9QCNXkZqUebautBvKM";

  beforeEach(function() {
    mockedEnvRestore = mockedEnv({
      INITIATE_LOGIN_ENDPOINT: initiateLoginEndpoint,
      M365_CLIENT_ID: clientId,
      M365_CLIENT_SECRET: clientSecret,
      M365_TENANT_ID: tenantId,
      M365_AUTHORITY_HOST: authorityHost
    });
    loadConfiguration();
  });

  afterEach(function() {
    mockedEnvRestore();
  });

  it("create MsGraphAuthProvider instance should throw InvalidParameter error with invalid scopes", function() {
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const invalidScopes: any = [10, 20];
    expect(() => {
      new MsGraphAuthProvider(oboCredential, invalidScopes);
    })
      .to.throw(ErrorWithCode, "The type of scopes is not valid, it must be string or string array")
      .with.property("code", ErrorCode.InvalidParameter);
  });

  it("create msGraphAuthProvider instance should success with OnBehalfOfUserCredential", function() {
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const authProvider: any = new MsGraphAuthProvider(oboCredential, scopes);
    expect(authProvider.credential).to.be.instanceOf(OnBehalfOfUserCredential);
  });

  it("create msGraphAuthProvider instance should success with M365TenantCredential", function() {
    const m356Credential = new M365TenantCredential();
    const authProvider: any = new MsGraphAuthProvider(m356Credential, scopes);
    expect(authProvider.credential).to.be.instanceOf(M365TenantCredential);
  });

  it("create msGraphAuthProvider instance should throw UiRequiredError with unconsent scope with OnBehalfOfUserCredential", async function() {
    sinon.stub(OnBehalfOfUserCredential.prototype, "getToken").callsFake(
      (): Promise<AccessToken | null> => {
        throw new ErrorWithCode(
          "Failed to get access token from authentication server, please login first.",
          ErrorCode.UiRequiredError
        );
      }
    );
    const unconsentScopes = "unconsent_scope";
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const authProvider = new MsGraphAuthProvider(oboCredential, unconsentScopes);
    await expect(authProvider.getAccessToken())
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.UiRequiredError);
    sinon.restore();
  });
});

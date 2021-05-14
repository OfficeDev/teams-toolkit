// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken } from "@azure/core-auth";
import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import {
  MsGraphAuthProvider,
  loadConfiguration,
  TeamsUserCredential,
  ErrorWithCode,
  ErrorCode,
} from "../../../src";
import sinon from "sinon";

chaiUse(chaiPromises);
describe("MsGraphAuthProvider Tests - Browser", () => {
  const clientId = "fake_client_id";
  const loginUrl = "fake_login_url";
  const authEndpoint = "fake_auth_endpoint";
  const scopes = "fake_scope";
  const emptyScope = "";
  const defaultScope = "https://graph.microsoft.com/.default";
  const accessToken = "fake_access_token";

  function loadDefaultConfig() {
    loadConfiguration({
      authentication: {
        initiateLoginEndpoint: loginUrl,
        simpleAuthEndpoint: authEndpoint,
        clientId: clientId,
      },
    });
  }

  beforeEach(function () {
    loadDefaultConfig();
  });

  it("create MsGraphAuthProvider instance should throw InvalidParameter error with invalid scope", function () {
    const credential = new TeamsUserCredential();
    const invalidScopes: any = [10, 20];
    expect(() => {
      new MsGraphAuthProvider(credential, invalidScopes);
    })
      .to.throw(ErrorWithCode, "The type of scopes is not valid, it must be string or string array")
      .with.property("code", ErrorCode.InvalidParameter);
  });

  it("create MsGraphAuthProvider instance should success with given scopes", async function () {
    const credential = new TeamsUserCredential();
    const authProvider: any = new MsGraphAuthProvider(credential, scopes);
    assert.strictEqual(authProvider.scopes, scopes);
  });

  it("create MsGraphAuthProvider instance should success with empty scope", async function () {
    const credential = new TeamsUserCredential();
    const authProvider: any = new MsGraphAuthProvider(credential, emptyScope);
    assert.strictEqual(authProvider.scopes, defaultScope);
  });

  it("create MsGraphAuthProvider instance should success without providing scope", async function () {
    const credential = new TeamsUserCredential();
    const authProvider: any = new MsGraphAuthProvider(credential);
    assert.strictEqual(authProvider.scopes, defaultScope);
  });

  it("getAccessToken should success with valid config", async function () {
    sinon
      .stub(TeamsUserCredential.prototype, "getToken")
      .callsFake((): Promise<AccessToken | null> => {
        const token: AccessToken = {
          token: accessToken,
          expiresOnTimestamp: Date.now(),
        };
        return new Promise((resolve) => {
          resolve(token);
        });
      });
    const credential = new TeamsUserCredential();
    const authProvider = new MsGraphAuthProvider(credential, scopes);
    const token = await authProvider.getAccessToken();
    assert.strictEqual(token, accessToken);
    sinon.restore();
  });

  it("getAccessToken should throw UiRequiredError with unconsent scope", async function () {
    sinon
      .stub(TeamsUserCredential.prototype, "getToken")
      .callsFake((): Promise<AccessToken | null> => {
        throw new ErrorWithCode(
          "Failed to get access token from authentication server, please login first.",
          ErrorCode.UiRequiredError
        );
      });
    const unconsentScopes = "unconsent_scope";
    const credential = new TeamsUserCredential();
    const authProvider = new MsGraphAuthProvider(credential, unconsentScopes);
    await expect(authProvider.getAccessToken())
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.UiRequiredError);
    sinon.restore();
  });
});

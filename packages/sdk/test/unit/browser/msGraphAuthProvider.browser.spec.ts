// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken } from "@azure/core-auth";
import { assert, expect, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import {
  TeamsFx,
  IdentityType,
  MsGraphAuthProvider,
  TeamsUserCredential,
  ErrorWithCode,
  ErrorCode,
} from "../../../src/index.browser";
import * as sinon from "sinon";

chaiUse(chaiPromises);
describe("MsGraphAuthProvider Tests - Browser", () => {
  const clientId = "fake_client_id";
  const loginUrl = "fake_login_url";
  const authEndpoint = "fake_auth_endpoint";
  const scopes = "fake_scope";
  const emptyScope = "";
  const defaultScope = "https://graph.microsoft.com/.default";
  const accessToken = "fake_access_token";
  const teamsfx = new TeamsFx(IdentityType.User, {
    initiateLoginEndpoint: loginUrl,
    simpleAuthEndpoint: authEndpoint,
    clientId: clientId,
  });

  it("create MsGraphAuthProvider instance should throw InvalidParameter error with invalid scope", function () {
    const invalidScopes: any = [10, 20];
    expect(() => {
      new MsGraphAuthProvider(teamsfx, invalidScopes);
    })
      .to.throw(ErrorWithCode, "The type of scopes is not valid, it must be string or string array")
      .with.property("code", ErrorCode.InvalidParameter);
  });

  it("create MsGraphAuthProvider instance should success with given scopes", async function () {
    const authProvider: any = new MsGraphAuthProvider(teamsfx, scopes);
    assert.strictEqual(authProvider.scopes, scopes);
  });

  it("create MsGraphAuthProvider instance should success with empty scope", async function () {
    const authProvider: any = new MsGraphAuthProvider(teamsfx, emptyScope);
    assert.strictEqual(authProvider.scopes, defaultScope);
  });

  it("create MsGraphAuthProvider instance should success without providing scope", async function () {
    const authProvider: any = new MsGraphAuthProvider(teamsfx);
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
    const authProvider = new MsGraphAuthProvider(teamsfx, scopes);
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
    const authProvider = new MsGraphAuthProvider(teamsfx, unconsentScopes);
    await expect(authProvider.getAccessToken())
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.UiRequiredError);
    sinon.restore();
  });
});

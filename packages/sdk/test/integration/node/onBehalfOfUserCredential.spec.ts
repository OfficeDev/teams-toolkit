// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";

import chaiPromises from "chai-as-promised";

import {
  ErrorCode,
  ErrorWithCode,
  loadConfiguration,
  OnBehalfOfUserCredential
} from "../../../src";
import { SSOTokenV2Info } from "../../../src/models/ssoTokenInfo";
import { parseJwt } from "../../../src/util/utils";
import { getAccessToken, MockEnvironmentVariable, RestoreEnvironmentVariable } from "../../helper";

chaiUse(chaiPromises);
let restore: () => void;

let ssoToken: string;
describe("onBehalfOfUserCredential Test: Node", () => {
  before(async () => {
    restore = MockEnvironmentVariable();
    loadConfiguration();

    ssoToken = await getAccessToken(
      process.env.SDK_INTEGRATION_TEST_TEAMS_AAD_CLIENT_ID!,
      process.env.SDK_INTEGRATION_TEST_ACCOUNT_NAME!,
      process.env.SDK_INTEGRATION_TEST_ACCOUNT_PASSWORD!,
      process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID!,
      process.env.SDK_INTEGRATION_TEST_TEAMS_ACCESS_AS_USER_SCOPE!
    );
  });

  it("Test onBehalfOfUserCredential get SSO token success", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken);
    let ssoTokenFromCredential = await credential.getToken([]);
    assert.strictEqual(ssoTokenFromCredential!.token, ssoToken);

    ssoTokenFromCredential = await credential.getToken("");
    assert.strictEqual(ssoTokenFromCredential!.token, ssoToken);
  });

  it("Test onBehalfOfUserCredential get user info success", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken);
    const userInfo = await credential.getUserInfo();
    const tokenObject = parseJwt(ssoToken) as SSOTokenV2Info;
    assert.strictEqual(userInfo.preferredUserName, tokenObject.preferred_username);
    assert.strictEqual(userInfo.objectId, tokenObject.oid);
    assert.strictEqual(userInfo.displayName, tokenObject.name);
  });

  it("Test onBehalfOfUserCredential get access token success", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken);
    const graphToken = await credential.getToken("https://graph.microsoft.com/User.Read");
    const tokenObject = parseJwt(graphToken!.token);
    const userInfo = await credential.getUserInfo();
    assert.strictEqual(tokenObject.oid, userInfo.objectId);
    assert.strictEqual(tokenObject.aud, "https://graph.microsoft.com");
    assert.include(tokenObject.scp, "User.Read");
  });

  it("Test onBehalfOfUserCredential get access token without permission", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken);
    await expect(credential.getToken("https://graph.microsoft.com/Calendars.Read"))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.InternalError);
  });

  afterEach(() => {
    RestoreEnvironmentVariable(restore);
  })
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken } from "@azure/identity";
import { assert, expect, use as chaiUse } from "chai";

import chaiPromises from "chai-as-promised";
import {
  ErrorCode,
  ErrorWithCode,
  loadConfiguration,
  OnBehalfOfUserCredential
} from "../../../src";
import { parseJwt } from "../../../src/util/utils";
import { getAccessToken } from "../../helper";

chaiUse(chaiPromises);

let ssoToken: string;
describe("onBehalfOfUserCredential Test: Node", () => {
  console.log(process.env);
  assert.strictEqual(process.env.SDK_INTEGRATION_TEST_AAD_CLIENTID_SSO!, "b0c47f29-3c57-4042-933f-a7d546bae387")
  before(async () => {
    process.env.M365_CLIENT_ID = process.env.SDK_INTEGRATION_TEST_AAD_CLIENTID_REMOTE;
    process.env.M365_CLIENT_SECRET = process.env.SDK_INTEGRATION_TEST_APP_CLIENT_SECRET_REMOTE;
    process.env.M365_TENANT_ID = process.env.SDK_INTEGRATION_TEST_AAD_TENANTID;
    process.env.M365_AUTHORITY_HOST = process.env.SDK_INTEGRATION_TEST_AAD_AUTHORITY_HOST;
    loadConfiguration();

    ssoToken = await getAccessToken(
      process.env.SDK_INTEGRATION_TEST_AAD_CLIENTID_SSO!,
      process.env.SDK_INTEGRATION_TEST_ACCOUNT_NAME!,
      process.env.SDK_INTEGRATION_TEST_ACCOUNT_PASSWORD!,
      process.env.SDK_INTEGRATION_TEST_AAD_TENANTID!,
      process.env.SDK_INTEGRATION_TEST_SCOPES_SSO!
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
    assert.strictEqual(userInfo.preferredUserName, process.env.SDK_INTEGRATION_TEST_ACCOUNT_NAME!);
  });

  it("Test onBehalfOfUserCredential get access token success", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken);
    const graphToken = await credential.getToken("https://graph.microsoft.com/User.Read");
    const tokenObject = parseJwt(graphToken!.token);
    const userInfo = await credential.getUserInfo();
    assert.strictEqual(tokenObject.oid, userInfo.objectId);
  });

  it("Test onBehalfOfUserCredential get access token without permission", async function () {
    const credential = new OnBehalfOfUserCredential(ssoToken);
    await expect(credential.getToken("https://graph.microsoft.com/Calendars.Read"))
      .to.eventually.be.rejectedWith(ErrorWithCode)
      .and.property("code", ErrorCode.InternalError);
  });
});

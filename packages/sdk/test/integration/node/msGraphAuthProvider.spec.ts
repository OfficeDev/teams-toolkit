// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import {
  loadConfiguration,
  OnBehalfOfUserCredential,
  M365TenantCredential,
  MsGraphAuthProvider,
} from "../../../src";
import {
  getSsoTokenFromTeams,
  MockEnvironmentVariable,
  RestoreEnvironmentVariable,
  AADJwtPayLoad,
} from "../helper";
import jwtDecode from "jwt-decode";

chaiUse(chaiPromises);
let restore: () => void;

describe("MsGraphAuthProvider Tests - Node", () => {
  let ssoToken = "";
  beforeEach(async function () {
    restore = MockEnvironmentVariable();
    loadConfiguration();

    ssoToken = await getSsoTokenFromTeams();
  });

  afterEach(() => {
    RestoreEnvironmentVariable(restore);
  });

  it("getAccessToken should success with OnBehalfOfUserCredential", async function () {
    const scopes = "User.Read";
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const authProvider: MsGraphAuthProvider = new MsGraphAuthProvider(oboCredential, scopes);
    const accessToken = await authProvider.getAccessToken();

    const decodedToken = jwtDecode<AADJwtPayLoad>(accessToken);
    assert.strictEqual(decodedToken.aud, "00000003-0000-0000-c000-000000000000");
    assert.strictEqual(decodedToken.appid, process.env.M365_CLIENT_ID);
    assert.strictEqual(decodedToken.idtyp, "user");
    assert.strictEqual(decodedToken.upn, process.env.SDK_INTEGRATION_TEST_ACCOUNT_NAME);
    assert.isTrue(decodedToken.scp!.indexOf(scopes) >= 0);
  });

  it("getAccessToken should success with M365TenantCredential", async function () {
    const scopes = ["https://graph.microsoft.com/.default"];
    const m356Credential = new M365TenantCredential();
    const authProvider: MsGraphAuthProvider = new MsGraphAuthProvider(m356Credential, scopes);
    const accessToken = await authProvider.getAccessToken();

    const decodedToken = jwtDecode<AADJwtPayLoad>(accessToken);
    assert.strictEqual(decodedToken.aud, "https://graph.microsoft.com");
    assert.strictEqual(decodedToken.appid, process.env.M365_CLIENT_ID);
    assert.strictEqual(decodedToken.idtyp, "app");
  });
});

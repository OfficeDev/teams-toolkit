// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { createMicrosoftGraphClient, loadConfiguration, TeamsUserCredential } from "../../../src";
import { getSSOToken, SSOToken } from "../helper.browser";
import sinon from "sinon";
import { AccessToken } from "@azure/core-auth";

chaiUse(chaiPromises);
const env = (window as any).__env__;

describe("MsGraphClientProvider Tests - Browser", () => {
  let ssoToken: SSOToken;

  beforeEach(async function() {
    ssoToken = await getSSOToken();

    // mock getting sso token.
    sinon.stub(TeamsUserCredential.prototype, <any>"getSSOToken").callsFake(
      (): Promise<AccessToken | null> => {
        return new Promise((resolve) => {
          resolve({
            token: ssoToken.token!,
            expiresOnTimestamp: ssoToken.expire_time!
          });
        });
      }
    );

    loadConfiguration({
      authentication: {
        initiateLoginEndpoint: "fake_login_url",
        simpleAuthEndpoint: "http://localhost:5000",
        clientId: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID
      }
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("create graph client with user.read scope should be able to get user profile", async function() {
    const scopes = ["User.Read"];
    const credential = new TeamsUserCredential();
    const graphClient: any = createMicrosoftGraphClient(credential, scopes);
    const profile = await graphClient.api("/me").get();
    assert.strictEqual(profile.userPrincipalName, env.SDK_INTEGRATION_TEST_ACCOUNT_NAME);
  });

  it("create graph client with empty scope should have the default scope", async function() {
    const emptyScope = "";
    const credential = new TeamsUserCredential();
    const graphClient: any = createMicrosoftGraphClient(credential, emptyScope);
    const userList = await graphClient.api("/users").get();
    assert.strictEqual(
      userList["@odata.context"],
      "https://graph.microsoft.com/v1.0/$metadata#users"
    );
  });

  it("create graph client without providing scope should have the default scope", async function() {
    const defaultScope = "https://graph.microsoft.com/.default";
    const credential = new TeamsUserCredential();
    const graphClient: any = createMicrosoftGraphClient(credential);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
    const userList = await graphClient.api("/users").get();
    assert.strictEqual(
      userList["@odata.context"],
      "https://graph.microsoft.com/v1.0/$metadata#users"
    );
  });
});

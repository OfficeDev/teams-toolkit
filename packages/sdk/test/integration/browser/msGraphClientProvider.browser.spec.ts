// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { createMicrosoftGraphClient, loadConfiguration, TeamsUserCredential } from "../../../src";
import { getSSOToken } from "../helper.browser";
import sinon from "sinon";
import { AccessToken } from "@azure/core-auth";

chaiUse(chaiPromises);
const env = (window as any).__env__;

describe("msGraphClientProvider - browser", () => {
  beforeEach(async function() {
    const ssoToken = await getSSOToken();
    // mock getting sso token.
    sinon.stub(TeamsUserCredential.prototype, <any>"getSSOToken").callsFake(
      (): Promise<AccessToken | null> => {
        return new Promise((resolve) => {
          resolve({
            token: ssoToken!,
            expiresOnTimestamp: Date.now() + 10 * 60 * 1000
          });
        });
      }
    );

    loadConfiguration({
      authentication: {
        initiateLoginEndpoint: "fake_login_url",
        simpleAuthEndpoint: "https://localhost:5001",
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

    // Current test user does not have admin permission so application credential can not perform any request successfully.
    const errorResult = await expect(graphClient.api("/users").get()).to.eventually.be.rejectedWith(
      Error
    );
    assert.include(errorResult.message, "Insufficient privileges to complete the operation.");
  });

  it("create graph client without providing scope should have the default scope", async function() {
    const defaultScope = "https://graph.microsoft.com/.default";
    const credential = new TeamsUserCredential();
    const graphClient: any = createMicrosoftGraphClient(credential);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);

    // Current test user does not have admin permission so application credential can not perform any request successfully.
    const errorResult = await expect(graphClient.api("/users").get()).to.eventually.be.rejectedWith(
      Error
    );
    assert.include(errorResult.message, "Insufficient privileges to complete the operation.");
  });
});

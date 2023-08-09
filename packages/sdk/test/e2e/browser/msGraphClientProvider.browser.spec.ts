// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import {
  createMicrosoftGraphClient,
  TeamsFx,
  IdentityType,
  TeamsUserCredentialAuthConfig,
  createMicrosoftGraphClientWithCredential,
} from "../../../src/index.browser";
import { TeamsUserCredential } from "../../../src/credential/teamsUserCredential.browser";
import {
  extractIntegrationEnvVariables,
  getGraphToken,
  getSSOToken,
  SSOToken,
} from "../helper.browser";
import * as sinon from "sinon";
import { AccessToken } from "@azure/core-auth";

chaiUse(chaiPromises);
extractIntegrationEnvVariables();
const env = (window as any).__env__;

describe("MsGraphClientProvider Tests - Browser", () => {
  let ssoToken: SSOToken;

  beforeEach(async function () {
    ssoToken = await getSSOToken();

    // mock getting sso token.
    sinon
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        return new Promise((resolve) => {
          resolve({
            token: ssoToken.token!,
            expiresOnTimestamp: ssoToken.expire_time!,
          });
        });
      });

    sinon
      .stub(TeamsUserCredential.prototype, "getToken")
      .callsFake(async (scopes: string | string[]): Promise<AccessToken | null> => {
        const graphToken = await getGraphToken(ssoToken, scopes);
        return new Promise((resolve) => {
          resolve({
            token: graphToken,
            expiresOnTimestamp: ssoToken.expire_time!,
          });
        });
      });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("create graph client with user.read scope should be able to get user profile", async function () {
    const scopes = ["User.Read"];
    const teamsfx = new TeamsFx(IdentityType.User, {
      initiateLoginEndpoint: "fake_login_url",
      clientId: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID,
    });
    const graphClient: any = createMicrosoftGraphClient(teamsfx, scopes);
    const profile = await graphClient.api("/me").get();
    assert.strictEqual(profile.userPrincipalName, env.SDK_INTEGRATION_TEST_ACCOUNT_NAME);
  });

  it("create graph client with empty scope should have the default scope", async function () {
    const emptyScope = "";
    const teamsfx = new TeamsFx(IdentityType.User, {
      initiateLoginEndpoint: "fake_login_url",
      clientId: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID,
    });
    const graphClient: any = createMicrosoftGraphClient(teamsfx, emptyScope);
    const userList = await graphClient.api("/users").get();
    assert.strictEqual(
      userList["@odata.context"],
      "https://graph.microsoft.com/v1.0/$metadata#users"
    );
  });

  it("create graph client without providing scope should have the default scope", async function () {
    const defaultScope = "https://graph.microsoft.com/.default";
    const teamsfx = new TeamsFx(IdentityType.User, {
      initiateLoginEndpoint: "fake_login_url",
      clientId: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID,
    });
    const graphClient: any = createMicrosoftGraphClient(teamsfx);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
    const userList = await graphClient.api("/users").get();
    assert.strictEqual(
      userList["@odata.context"],
      "https://graph.microsoft.com/v1.0/$metadata#users"
    );
  });
});

describe("MsGraphClientProvider Tests with Credential - Browser", () => {
  let ssoToken: SSOToken;

  beforeEach(async function () {
    ssoToken = await getSSOToken();

    // mock getting sso token.
    sinon
      .stub(TeamsUserCredential.prototype, <any>"getSSOToken")
      .callsFake((): Promise<AccessToken | null> => {
        return new Promise((resolve) => {
          resolve({
            token: ssoToken.token!,
            expiresOnTimestamp: ssoToken.expire_time!,
          });
        });
      });

    sinon
      .stub(TeamsUserCredential.prototype, "getToken")
      .callsFake(async (scopes: string | string[]): Promise<AccessToken | null> => {
        const graphToken = await getGraphToken(ssoToken, scopes);
        return new Promise((resolve) => {
          resolve({
            token: graphToken,
            expiresOnTimestamp: ssoToken.expire_time!,
          });
        });
      });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("create graph client with user.read scope should be able to get user profile", async function () {
    const scopes = ["User.Read"];
    const authConfig: TeamsUserCredentialAuthConfig = {
      initiateLoginEndpoint: "fake_login_url",
      clientId: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID,
    };
    const credential: TeamsUserCredential = new TeamsUserCredential(authConfig);

    const graphClient: any = createMicrosoftGraphClientWithCredential(credential, scopes);
    const profile = await graphClient.api("/me").get();
    assert.strictEqual(profile.userPrincipalName, env.SDK_INTEGRATION_TEST_ACCOUNT_NAME);
  });

  it("create graph client with empty scope should have the default scope", async function () {
    const emptyScope = "";
    const authConfig: TeamsUserCredentialAuthConfig = {
      initiateLoginEndpoint: "fake_login_url",
      clientId: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID,
    };
    const credential: TeamsUserCredential = new TeamsUserCredential(authConfig);

    const graphClient: any = createMicrosoftGraphClientWithCredential(credential, emptyScope);
    const userList = await graphClient.api("/users").get();
    assert.strictEqual(
      userList["@odata.context"],
      "https://graph.microsoft.com/v1.0/$metadata#users"
    );
  });

  it("create graph client without providing scope should have the default scope", async function () {
    const defaultScope = "https://graph.microsoft.com/.default";
    const authConfig: TeamsUserCredentialAuthConfig = {
      initiateLoginEndpoint: "fake_login_url",
      clientId: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID,
    };
    const credential: TeamsUserCredential = new TeamsUserCredential(authConfig);

    const graphClient: any = createMicrosoftGraphClientWithCredential(credential);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
    const userList = await graphClient.api("/users").get();
    assert.strictEqual(
      userList["@odata.context"],
      "https://graph.microsoft.com/v1.0/$metadata#users"
    );
  });
});

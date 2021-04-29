// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken } from "@azure/core-auth";
import { assert, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import {
  MsGraphAuthProvider,
  loadConfiguration,
  TeamsUserCredential,
  GetTokenOptions
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
        clientId: clientId
      }
    });
  }

  beforeEach(function () {
    loadDefaultConfig();
  });

  it("MsGraphAuthProvider: Create MsGraphAuthProvider with given scopes", async function () {
    const credential = new TeamsUserCredential();
    const authProvider: any = new MsGraphAuthProvider(credential, scopes);
    assert.strictEqual(authProvider.scopes, scopes);
  });

  it("MsGraphAuthProvider: Create MsGraphAuthProvider with empty scope", async function () {
    const credential = new TeamsUserCredential();
    const authProvider: any = new MsGraphAuthProvider(credential, emptyScope);
    assert.strictEqual(authProvider.scopes, defaultScope);
  });

  it("MsGraphAuthProvider: Create MsGraphAuthProvider without providing scope", async function () {
    const credential = new TeamsUserCredential();
    const authProvider: any = new MsGraphAuthProvider(credential);
    assert.strictEqual(authProvider.scopes, defaultScope);
  });

  it("MsGraphAuthProvider: Get access token from MsGraphAuthProvider", async function () {
    sinon.stub(TeamsUserCredential.prototype, "getToken").callsFake(
      (scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken | null> => {
        const token: AccessToken = {
          token: accessToken,
          expiresOnTimestamp: Date.now()
        };
        return new Promise((resolve) => {
          resolve(token);
        });
      }
    );
    const credential = new TeamsUserCredential();
    const authProvider = new MsGraphAuthProvider(credential, scopes);
    const token = await authProvider.getAccessToken();
    assert.strictEqual(token, accessToken);
    sinon.restore();
  });
});

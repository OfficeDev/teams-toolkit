// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { createMicrosoftGraphClient, loadConfiguration, TeamsUserCredential } from "../../../src";

chaiUse(chaiPromises);
describe("MsGraphClientProvider Tests - Browser", () => {
  const clientId = "fake_client_id";
  const loginUrl = "fake_login_url";
  const authEndpoint = "fake_auth_endpoint";
  const scopes = "fake_scope";
  const emptyScope = "";
  const defaultScope = "https://graph.microsoft.com/.default";

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

  it("MsGraphClientProvider: Create graph client with given scopes", function () {
    const credential = new TeamsUserCredential();
    const graphClient: any = createMicrosoftGraphClient(credential, scopes);
    assert.strictEqual(graphClient.config.authProvider.scopes, scopes);
    expect(graphClient.config.authProvider.credential).to.be.instanceOf(TeamsUserCredential);
  });

  it("MsGraphClientProvider: Create graph client with empty scope", function () {
    const credential = new TeamsUserCredential();
    const graphClient: any = createMicrosoftGraphClient(credential, emptyScope);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
    expect(graphClient.config.authProvider.credential).to.be.instanceOf(TeamsUserCredential);
  });

  it("MsGraphClientProvider: Create graph client without providing scope", function () {
    const credential = new TeamsUserCredential();
    const graphClient: any = createMicrosoftGraphClient(credential);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
    expect(graphClient.config.authProvider.credential).to.be.instanceOf(TeamsUserCredential);
  });
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import {
  createMicrosoftGraphClient,
  ErrorCode,
  ErrorWithCode,
  TeamsFx,
} from "../../../src/index.browser";

chaiUse(chaiPromises);
describe("MsGraphClientProvider Tests - Browser", () => {
  const clientId = "fake_client_id";
  const loginUrl = "fake_login_url";
  const authEndpoint = "fake_auth_endpoint";
  const scopes = "fake_scope";
  const emptyScope = "";
  const defaultScope = "https://graph.microsoft.com/.default";
  const teamsfx = new TeamsFx();
  teamsfx.setCustomConfig({
    initiateLoginEndpoint: loginUrl,
    simpleAuthEndpoint: authEndpoint,
    clientId: clientId,
  });

  it("createMicrosoftGraphClient should throw InvalidParameter error with invalid scope", function () {
    const invalidScopes: any = [10, 20];
    expect(() => {
      createMicrosoftGraphClient(teamsfx, invalidScopes);
    })
      .to.throw(ErrorWithCode, "The type of scopes is not valid, it must be string or string array")
      .with.property("code", ErrorCode.InvalidParameter);
  });

  it("createMicrosoftGraphClient should success with given scopes", function () {
    const graphClient: any = createMicrosoftGraphClient(teamsfx, scopes);
    assert.strictEqual(graphClient.config.authProvider.scopes, scopes);
  });

  it("createMicrosoftGraphClient should success with empty scope", function () {
    const graphClient: any = createMicrosoftGraphClient(teamsfx, emptyScope);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
  });

  it("createMicrosoftGraphClient should success without providing scope", function () {
    const graphClient: any = createMicrosoftGraphClient(teamsfx);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
  });
});

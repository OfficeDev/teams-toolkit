// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import * as chaiPromises from "chai-as-promised";
import {
  TeamsUserCredential,
  createMicrosoftGraphClient,
  ErrorCode,
  ErrorWithCode,
  TeamsFx,
  IdentityType,
  createMicrosoftGraphClientWithCredential,
} from "../../../src/index.browser";
import { TeamsUserCredentialAuthConfig } from "../../../src/models/configuration";

chaiUse(chaiPromises);
describe("MsGraphClientProvider Tests - Browser", () => {
  const clientId = "fake_client_id";
  const loginUrl = "fake_login_url";
  const authEndpoint = "fake_auth_endpoint";
  const scopes = "fake_scope";
  const emptyScope = "";
  const defaultScope = "https://graph.microsoft.com/.default";
  const teamsfx = new TeamsFx(IdentityType.User, {
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

describe("MsGraphClientProvider Tests for createMicrosoftGraphClientWithCredential - Browser", () => {
  const clientId = "fake_client_id";
  const loginUrl = "fake_login_url";
  const scopes = "fake_scope";
  const emptyScope = "";
  const defaultScope = "https://graph.microsoft.com/.default";
  const authConfig: TeamsUserCredentialAuthConfig = {
    clientId: clientId,
    initiateLoginEndpoint: loginUrl,
  };

  it("createMicrosoftGraphClientWithCredential should throw InvalidParameter error with invalid scope", function () {
    const invalidScopes: any = [10, 20];
    expect(() => {
      const credential = new TeamsUserCredential(authConfig);
      createMicrosoftGraphClientWithCredential(credential, invalidScopes);
    })
      .to.throw(ErrorWithCode, "The type of scopes is not valid, it must be string or string array")
      .with.property("code", ErrorCode.InvalidParameter);
  });

  it("createMicrosoftGraphClient should success with given scopes", function () {
    const credential = new TeamsUserCredential(authConfig);
    const graphClient: any = createMicrosoftGraphClientWithCredential(credential, scopes);
    assert.strictEqual(graphClient.config.authProvider.scopes, scopes);
  });

  it("createMicrosoftGraphClient should success with empty scope", function () {
    const credential = new TeamsUserCredential(authConfig);
    const graphClient: any = createMicrosoftGraphClientWithCredential(credential, emptyScope);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
  });

  it("createMicrosoftGraphClient should success without providing scope", function () {
    const credential = new TeamsUserCredential(authConfig);
    const graphClient: any = createMicrosoftGraphClientWithCredential(credential);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
  });
});

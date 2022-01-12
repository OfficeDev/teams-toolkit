// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import mockedEnv from "mocked-env";
import * as chaiPromises from "chai-as-promised";
import {
  createMicrosoftGraphClient,
  ErrorCode,
  ErrorWithCode,
  TeamsUserCredential,
} from "../../../src/index.browser";

chaiUse(chaiPromises);
describe("MsGraphClientProvider Tests - Browser", () => {
  const clientId = "fake_client_id";
  const loginUrl = "fake_login_url";
  const authEndpoint = "fake_auth_endpoint";
  const scopes = "fake_scope";
  const emptyScope = "";
  const defaultScope = "https://graph.microsoft.com/.default";

  let mockedEnvRestore: () => void;

  beforeEach(function () {
    mockedEnvRestore = mockedEnv({
      REACT_APP_CLIENT_ID: clientId,
      REACT_APP_TEAMSFX_ENDPOINT: authEndpoint,
      REACT_APP_START_LOGIN_PAGE_URL: loginUrl,
    });
  });

  afterEach(function () {
    mockedEnvRestore();
  });

  it("createMicrosoftGraphClient should throw InvalidParameter error with invalid scope", function () {
    const credential = new TeamsUserCredential();
    const invalidScopes: any = [10, 20];
    expect(() => {
      createMicrosoftGraphClient(credential, invalidScopes);
    })
      .to.throw(ErrorWithCode, "The type of scopes is not valid, it must be string or string array")
      .with.property("code", ErrorCode.InvalidParameter);
  });

  it("createMicrosoftGraphClient should success with given scopes", function () {
    const credential = new TeamsUserCredential();
    const graphClient: any = createMicrosoftGraphClient(credential, scopes);
    assert.strictEqual(graphClient.config.authProvider.scopes, scopes);
    expect(graphClient.config.authProvider.credential).to.be.instanceOf(TeamsUserCredential);
  });

  it("createMicrosoftGraphClient should success with empty scope", function () {
    const credential = new TeamsUserCredential();
    const graphClient: any = createMicrosoftGraphClient(credential, emptyScope);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
    expect(graphClient.config.authProvider.credential).to.be.instanceOf(TeamsUserCredential);
  });

  it("createMicrosoftGraphClient should success without providing scope", function () {
    const credential = new TeamsUserCredential();
    const graphClient: any = createMicrosoftGraphClient(credential);
    assert.strictEqual(graphClient.config.authProvider.scopes, defaultScope);
    expect(graphClient.config.authProvider.credential).to.be.instanceOf(TeamsUserCredential);
  });
});

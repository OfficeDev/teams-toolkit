// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import "isomorphic-fetch";
import chaiPromises from "chai-as-promised";
import {
  createMicrosoftGraphClient,
  loadConfiguration,
  OnBehalfOfUserCredential,
  M365TenantCredential
} from "../../../src";
import {
  getSsoTokenFromTeams,
  MockEnvironmentVariable,
  RestoreEnvironmentVariable
} from "../../helper";

chaiUse(chaiPromises);
let restore: () => void;

describe("msGraphClientProvider - node", () => {
  let ssoToken = "";
  beforeEach(async function() {
    restore = MockEnvironmentVariable();
    loadConfiguration();

    ssoToken = await getSsoTokenFromTeams();
  });

  afterEach(() => {
    RestoreEnvironmentVariable(restore);
  });

  it("create graph client with OnBehalfOfUserCredential", async function() {
    const scopes = ["User.Read"];
    const oboCredential = new OnBehalfOfUserCredential(ssoToken);
    const graphClient: any = createMicrosoftGraphClient(oboCredential, scopes);
    const profile = await graphClient.api("/me").get();
    assert.strictEqual(profile.userPrincipalName, process.env.SDK_INTEGRATION_TEST_ACCOUNT_NAME);
  });

  it("create graph client with M365TenantCredential", async function() {
    const scopes = ["https://graph.microsoft.com/.default"];
    const m356Credential = new M365TenantCredential();
    const graphClient: any = createMicrosoftGraphClient(m356Credential, scopes);

    // Current test user does not have admin permission so application credential can not perform any request successfully.
    const errorResult = await expect(graphClient.api("/users").get()).to.eventually.be.rejectedWith(
      Error
    );
    assert.include(errorResult.message, "Insufficient privileges to complete the operation.");
  });
});

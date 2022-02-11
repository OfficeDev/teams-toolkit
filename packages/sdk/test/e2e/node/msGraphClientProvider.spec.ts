// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import "isomorphic-fetch";
import * as chaiPromises from "chai-as-promised";
import { createMicrosoftGraphClient, TeamsFx, IdentityType } from "../../../src";
import {
  getSsoTokenFromTeams,
  MockEnvironmentVariable,
  RestoreEnvironmentVariable,
} from "../helper";

chaiUse(chaiPromises);
let restore: () => void;

describe("createMicrosoftGraphClient Tests - Node", () => {
  let ssoToken = "";
  beforeEach(async function () {
    restore = MockEnvironmentVariable();

    ssoToken = await getSsoTokenFromTeams();
  });

  afterEach(() => {
    RestoreEnvironmentVariable(restore);
  });

  it("call graph API should success with OnBehalfOfUserCredential", async function () {
    const scopes = ["User.Read"];
    const teamsfx = new TeamsFx().setSsoToken(ssoToken);
    const graphClient: any = createMicrosoftGraphClient(teamsfx, scopes);
    const profile = await graphClient.api("/me").get();
    assert.strictEqual(profile.userPrincipalName, process.env.SDK_INTEGRATION_TEST_ACCOUNT_NAME);
  });

  it("call graph API should failed when M365TenantCredential credential do not have admin permission", async function () {
    const scopes = ["https://graph.microsoft.com/.default"];
    const teamsfx = new TeamsFx(IdentityType.App);
    const graphClient: any = createMicrosoftGraphClient(teamsfx, scopes);

    // Current test user does not have admin permission so application credential can not perform any request successfully.
    const errorResult = await expect(graphClient.api("/users").get()).to.eventually.be.rejectedWith(
      Error
    );
    assert.include(errorResult.message, "Insufficient privileges to complete the operation.");
  });
});

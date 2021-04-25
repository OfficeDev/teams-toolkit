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
import { getAccessToken } from "../../helper";

chaiUse(chaiPromises);

describe("msGraphClientProvider - node", () => {
  let ssoToken = "";
  beforeEach(async function() {
    process.env.M365_CLIENT_ID = process.env.SDK_INTEGRATIONTEST_AAD_CLIENTID_LOCAL;
    process.env.M365_CLIENT_SECRET = process.env.SDK_INTEGRATIONTEST_AAD_CLIENT_SECRET_LOCAL;
    process.env.M365_TENANT_ID = process.env.SDK_INTEGRATIONTEST_AAD_TENANTID;
    process.env.M365_AUTHORITY_HOST = process.env.SDK_INTEGRATIONTEST_AAD_AUTHORITY_HOST;
    loadConfiguration();

    ssoToken = await getAccessToken(process.env.SDK_INTEGRATIONTEST_AAD_CLIENTID_LOCAL!,
      process.env.SDK_INTEGRATION_TEST_ACCOUNT_NAME!,
      process.env.SDK_INTEGRATION_TEST_ACCOUNT_PASSWORD!,
      process.env.SDK_INTEGRATIONTEST_AAD_TENANTID!);
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
    const errorResult = await expect(graphClient.api("/users").get()).to.eventually.be.rejectedWith(Error);
    assert.include(errorResult.message, "Insufficient privileges to complete the operation.");
  });
});

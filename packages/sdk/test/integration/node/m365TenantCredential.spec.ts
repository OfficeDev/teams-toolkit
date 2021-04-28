// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import mockedEnv from "mocked-env";
import { loadConfiguration, M365TenantCredential } from "../../../src";
import { ErrorCode, ErrorWithCode } from "../../../src/core/errors";
import jwtDecode from "jwt-decode";
import { MockEnvironmentVariable, RestoreEnvironmentVariable, AADJwtPayLoad } from "../../helper";

chaiUse(chaiPromises);
let restore: () => void;
describe("m365TenantCredential - node", () => {
  const fake_client_secret = "fake_client_secret";
  const defaultGraphScope = ["https://graph.microsoft.com/.default"];

  beforeEach(function() {
    restore = MockEnvironmentVariable();
    loadConfiguration();
  });

  afterEach(() => {
    RestoreEnvironmentVariable(restore);
  });

  it("create M365TenantCredential with valid configuration", function() {
    const credential: any = new M365TenantCredential();

    assert.strictEqual(credential.clientSecretCredential.clientId, process.env.M365_CLIENT_ID);
    assert.strictEqual(credential.clientSecretCredential.tenantId, process.env.M365_TENANT_ID);
    assert.strictEqual(
      credential.clientSecretCredential.clientSecret,
      process.env.M365_CLIENT_SECRET
    );
    assert.strictEqual(
      credential.clientSecretCredential.identityClient.authorityHost,
      process.env.M365_AUTHORITY_HOST
    );
  });

  it("get access token", async function() {
    const credential = new M365TenantCredential();
    const token = await credential.getToken(defaultGraphScope);
    const tokenFromCache = await credential.getToken(defaultGraphScope);

    const decodedToken = jwtDecode<AADJwtPayLoad>(token!.token);
    assert.strictEqual(decodedToken.aud, "https://graph.microsoft.com");
    assert.strictEqual(decodedToken.appid, process.env.M365_CLIENT_ID);
    assert.strictEqual(decodedToken.idtyp, "app");
  });

  it("get access token with authentication error", async function() {
    restore = mockedEnv({
      M365_CLIENT_SECRET: fake_client_secret
    });
    loadConfiguration();
    const credential = new M365TenantCredential();

    const errorResult = await expect(
      credential.getToken(defaultGraphScope)
    ).to.eventually.be.rejectedWith(ErrorWithCode);
    assert.strictEqual(errorResult.code, ErrorCode.ServiceError);
    assert.include(
      errorResult.message,
      "Get M365 tenant credential with authentication error: status code 401"
    );
  });
});

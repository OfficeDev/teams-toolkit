// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { AccessToken, GetTokenOptions } from "@azure/core-auth";
import sinon from "sinon";
import { getAccessToken, MockEnvironmentVariable, RestoreEnvironmentVariable } from "../../helper";
import { loadConfiguration, TeamsUserCredential } from "../../../src";

chaiUse(chaiPromises);
let restore: () => void;

describe("TeamsUserCredential Integration Test - browser", () => {
    console.log("============================hello");
    let AADClientIdSSO: string | undefined = process.env.SDK_INTEGRATION_TEST_TEAMS_AAD_CLIENT_ID;
    let TestAccountUserName: string | undefined = process.env.SDK_INTEGRATION_TEST_ACCOUNT_NAME;
    let TestAccountPassword: string | undefined = process.env.SDK_INTEGRATION_TEST_ACCOUNT_PASSWORD;
    let TestAccountTenantId: string | undefined = process.env.SDK_INTEGRATION_TEST_AAD_TENANT_ID;
    before(() => {
        // restore = MockEnvironmentVariable
        // loadConfiguration();
    });
    after(() => {
        // RestoreEnvironmentVariable(restore);
    });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    it("GetUserInfo local Success", async function () {
        // get SSO token.
        const ssoToken = await getAccessToken(AADClientIdSSO!, TestAccountUserName!, TestAccountPassword!, TestAccountTenantId!);
        sinon.stub(TeamsUserCredential.prototype, <any>"getSSOToken").callsFake(
            (scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken | null> => {
                return new Promise((resolve, reject) => {
                    resolve({
                        token: ssoToken!,
                        expiresOnTimestamp: Date.now()
                    });
                });
            }
        );
        console.log("============", ssoToken);
        const credential: TeamsUserCredential = new TeamsUserCredential();
        assert.isNotNull(credential);
        assert.isNotNull(ssoToken);
    });
    it("login success", async function () {
        const ssoToken = await getAccessToken(AADClientIdSSO!, TestAccountUserName!, TestAccountPassword!, TestAccountTenantId!);
        sinon.stub(TeamsUserCredential.prototype, <any>"getSSOToken").callsFake(
            (scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken | null> => {
                return new Promise((resolve, reject) => {
                    resolve({
                        token: ssoToken!,
                        expiresOnTimestamp: Date.now()
                    });
                });
            }
        );
        const credential: TeamsUserCredential = new TeamsUserCredential();
        const scopeStr = "user.read";
        await credential.login(scopeStr);
    });
    it("login failed without consent scope", async function(){
        const ssoToken = await getAccessToken(AADClientIdSSO!, TestAccountUserName!, TestAccountPassword!, TestAccountTenantId!);
        sinon.stub(TeamsUserCredential.prototype, <any>"getSSOToken").callsFake(
            (scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken | null> => {
                return new Promise((resolve, reject) => {
                    resolve({
                        token: ssoToken!,
                        expiresOnTimestamp: Date.now()
                    });
                });
            }
        );
        const credential: TeamsUserCredential = new TeamsUserCredential();
        const scopeStr = "Mail.Read";
        await expect(credential.login(scopeStr)).to.eventually.be.rejectedWith(Error);
    });
    it("check access token for login info", async function(){
        const ssoToken = await getAccessToken(AADClientIdSSO!, TestAccountUserName!, TestAccountPassword!, TestAccountTenantId!);
        sinon.stub(TeamsUserCredential.prototype, <any>"getSSOToken").callsFake(
            (scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken | null> => {
                return new Promise((resolve, reject) => {
                    resolve({
                        token: ssoToken!,
                        expiresOnTimestamp: Date.now()
                    });
                });
            }
        );
        const credential: TeamsUserCredential = new TeamsUserCredential();
        const scopeStr = "user.read";
        await credential.login(scopeStr);
    });
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { AccessToken, GetTokenOptions } from "@azure/core-auth";
import sinon from "sinon";
import { loadConfiguration, TeamsUserCredential, ErrorWithCode, ErrorCode } from "../../../src";
import { getSSOToken } from "../helper.browser";

chaiUse(chaiPromises);
const env = (window as any).__env__;
describe("TeamsUserCredential Integration Test - browser", () => {
    let ssoToken: string;
    const fakeLoginEndpoint:string =  "FakeLoginEndpoint";
    before(async () => {
        ssoToken = await getSSOToken();
        loadConfiguration({
            authentication: {
                initiateLoginEndpoint: fakeLoginEndpoint,
                simpleAuthEndpoint: "http://localhost:5000",
                clientId: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID
              }
        });
        sinon.stub(TeamsUserCredential.prototype, <any>"getSSOToken").callsFake(
            (scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken | null> => {
                return new Promise((resolve, reject) => {
                    resolve({
                        token: ssoToken!,
                        expiresOnTimestamp: Date.now() + 10 * 60 * 1000
                    });
                });
            }
        );
    });
    after(()=>{
        sinon.restore();
    })
    
    it("GetUserInfo should success with SSOToken", async function () {
        const credential: TeamsUserCredential = new TeamsUserCredential();
        const info = await credential.getUserInfo();
        assert.strictEqual(info.preferredUserName, env.SDK_INTEGRATION_TEST_ACCOUNT_NAME);
    });

    it("GetToken should success with consent scope", async function(){
        const credential: TeamsUserCredential = new TeamsUserCredential();
        await expect(credential.getToken(["User.Read"])).to.be.eventually.have.property('token');
    });

    it("GetToken should throw UiRequiredError with unconsent scope", async function() {
        const credential: TeamsUserCredential = new TeamsUserCredential();
        await expect(credential.getToken(["Calendars.Read"])).to.eventually.be.rejectedWith(ErrorWithCode).and.property("code", ErrorCode.UiRequiredError);;
    })
});

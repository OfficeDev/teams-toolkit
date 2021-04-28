// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { assert, expect, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { AccessToken, GetTokenOptions } from "@azure/core-auth";
import sinon from "sinon";
import { loadConfiguration, TeamsUserCredential } from "../../../src";
import { getSSOToken } from "../helper.browser";
import { UserTeamRole } from "@microsoft/teams-js";
chaiUse(chaiPromises);
let restore: () => void;
const env = (window as any).__env__;
describe("TeamsUserCredential Integration Test - browser", () => {
    let ssoToken: string;
    const fakeLoginEndpoint:string =  "FakeLoginEndpoint";
    before(async () => {
        ssoToken = await getSSOToken();
        // restore = MockEnvironmentVariable
        loadConfiguration({
            authentication: {
                initiateLoginEndpoint: fakeLoginEndpoint,
                simpleAuthEndpoint: "https://localhost:5001",
                clientId: env.SDK_INTEGRATION_TEST_M365_AAD_CLIENT_ID
              }
        });
    });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    // it("GetUserInfo local Success", async function () {
    //     // get SSO token.
    //     sinon.stub(TeamsUserCredential.prototype, <any>"getSSOToken").callsFake(
    //         (scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken | null> => {
    //             return new Promise((resolve, reject) => {
    //                 resolve({
    //                     token: ssoToken!,
    //                     expiresOnTimestamp: Date.now() + 10 * 60 * 1000
    //                 });
    //             });
    //         }
    //     );
    //     const credential: TeamsUserCredential = new TeamsUserCredential();
    //     const info = await credential.getUserInfo();
    //     const token = await credential.getToken(["User.Read"]);
    //     console.log("========", token);
    // });
});

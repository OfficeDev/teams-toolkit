// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import { loadConfiguration, getAuthenticationConfiguration } from "../../../src";

chaiUse(chaiPromises);

describe("configurationProvider integration test - browser", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    it("getResourceConfiguration success", function () {
        loadConfiguration();

        const authConfig = getAuthenticationConfiguration();

        assert.isNotNull(authConfig);
        if (authConfig) {
            assert.strictEqual(authConfig.initiateLoginEndpoint, process.env.INITIATE_LOGIN_ENDPOINT);
            assert.strictEqual(authConfig.clientId, process.env.M365_CLIENT_ID);
            assert.strictEqual(authConfig.simpleAuthEndpoint, process.env.SIMPLE_AUTH_ENDPOINT);
        }
    });

    it("getAuthenticationConfiguration should get undefined result if loadConfiguration without parameter", function () {
        loadConfiguration({});
        const authConfig = getAuthenticationConfiguration();
        assert.isUndefined(authConfig);
    });
});





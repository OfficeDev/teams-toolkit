// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import { PluginContext } from "teamsfx-api";
import chaiAsPromised from "chai-as-promised";

import { FrontendConfig } from "../../../../../src/plugins/resource/frontend/configs";
import { FrontendConfigInfo } from "../../../../../src/plugins/resource/frontend/constants";
import { InvalidTemplateManifestError, NotScaffoldError, UnauthenticatedError } from "../../../../../src/plugins/resource/frontend/resources/errors";
import { TestHelper } from "../helper";

chai.use(chaiAsPromised);

describe("frontendConfig", () => {
    function assertRejected(fn: () => Promise<FrontendConfig>, errorName: string) {
        chai.expect(fn()).to.eventually.be.rejectedWith().and.have.property("name").include(errorName);
    }

    describe("fromPluginContext", () => {
        let pluginContext: PluginContext;
        beforeEach(() => {
            pluginContext = TestHelper.getFakePluginContext();
        });

        it("happy path", async () => {
            const config = FrontendConfig.fromPluginContext(pluginContext);
            chai.assert.exists(config);
        });

        it("no azure credential", async () => {
            pluginContext.azureAccountProvider = undefined;
            assertRejected(() => FrontendConfig.fromPluginContext(pluginContext), new UnauthenticatedError().code);
        });

        it("no configs", async () => {
            pluginContext.configOfOtherPlugins = new Map([["solution", new Map()]]);

            assertRejected(() => FrontendConfig.fromPluginContext(pluginContext), new NotScaffoldError().code);
        });

        it("invalid storage name", async () => {
            const invalidStorageName = "dangerous.com/";
            pluginContext.config.set(FrontendConfigInfo.StorageName, invalidStorageName);
            assertRejected(
                () => FrontendConfig.fromPluginContext(pluginContext),
                new InvalidTemplateManifestError().code,
            );
        });
    });
});

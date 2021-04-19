// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { registerAADAppAndGetSecretByGraph, registerAADAppAndGetSecretByAppStudio } from "../../../../../src/plugins/resource/bot/aadRegistration";
import { PluginError } from "../../../../../src/plugins/resource/bot/errors";

describe("AAD Registration", () => {
    describe("registerAADAppAndGetSecretByGraph", () => {
        it("Invalid Graph Token", async () => {
            // Arrange
            const graphToken = "some ivalid graph token";
            const displayName = "invalidGraphToken";

            // Act
            try {
                await registerAADAppAndGetSecretByGraph(graphToken, displayName);
            } catch (e) {
                chai.assert.isTrue(e instanceof PluginError);
                return;
            }

            chai.assert.isTrue(false);

        });
    });

    describe("registerAADAppAndGetSecretByAppStudio", () => {
        it("Invalid App Studio Token", async () => {
            // Arrange
            const appStudioToken = "some invalid app studio token";
            const displayName = "invalidAppStudioToken";

            // Act
            try {
                await registerAADAppAndGetSecretByAppStudio(appStudioToken, displayName);
            } catch (e) {
                chai.assert.isTrue(e instanceof PluginError);
                return;
            }

            chai.assert.isTrue(false);
        });
    });
});
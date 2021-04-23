// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import { AADRegistration } from "../../../../../src/plugins/resource/bot/aadRegistration";
import { PluginError } from "../../../../../src/plugins/resource/bot/errors";
import { default as axios } from "axios";

describe("AAD Registration", () => {
    describe("registerAADAppAndGetSecretByGraph", () => {
        it("Invalid Graph Token", async () => {
            // Arrange
            const graphToken = "some ivalid graph token";
            const displayName = "invalidGraphToken";

            // Act
            try {
                await AADRegistration.registerAADAppAndGetSecretByGraph(graphToken, displayName);
            } catch (e) {
                chai.assert.isTrue(e instanceof PluginError);
                return;
            }

            chai.assert.isTrue(false);

        });

        it("Happy Path", async () => {
            // Arrange
            const graphToken = "anything";
            const displayName = "any name";

            const fakeAxiosInstance = axios.create();
            sinon.stub(fakeAxiosInstance, "post").resolves({
                status: 200,
                data: {
                    appId: "appId",
                    id: "id",
                    secretText: "secretText"
                }
            });
            sinon.stub(axios, "create").returns(fakeAxiosInstance);

            // Act
            const result = await AADRegistration.registerAADAppAndGetSecretByGraph(graphToken, displayName);

            // Assert
            chai.assert.isTrue(result.clientId === "appId");
            chai.assert.isTrue(result.objectId === "id");
            chai.assert.isTrue(result.clientSecret === "secretText");
        });
    });

    describe("registerAADAppAndGetSecretByAppStudio", () => {
        it("Invalid App Studio Token", async () => {
            // Arrange
            const appStudioToken = "some invalid app studio token";
            const displayName = "invalidAppStudioToken";

            // Act
            try {
                await AADRegistration.registerAADAppAndGetSecretByAppStudio(appStudioToken, displayName);
            } catch (e) {
                chai.assert.isTrue(e instanceof PluginError);
                return;
            }

            chai.assert.isTrue(false);
        });
    });
});
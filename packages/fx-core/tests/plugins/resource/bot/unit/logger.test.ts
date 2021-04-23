// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import { Logger } from "../../../../../src/plugins/resource/bot/logger";
import { LogProvider } from "fx-api";
import * as testUtils from "./utils";

describe("Logger", () => {
    describe("Happy Path", () => {
        const logProvider = testUtils.generateFakeLogProvider();
        beforeEach(() => {
            Logger.setLogger(logProvider);
        });

        it("info", async () => {
            // Arrange
            const spy = sinon.spy(logProvider, "info");

            // Act
            Logger.info("something");

            // Assert
            chai.assert.isTrue(spy.calledOnce);
        });

        it("warning", async () => {
            // Arrange
            const spy = sinon.spy(logProvider, "warning");

            // Act
            Logger.warning("something");

            // Assert
            chai.assert.isTrue(spy.calledOnce);
        });

        it("error", async () => {
            // Arrange
            const spy = sinon.spy(logProvider, "error");

            // Act
            Logger.error("something");

            // Assert
            chai.assert.isTrue(spy.calledOnce);
        });
    });
});
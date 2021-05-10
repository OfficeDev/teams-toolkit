// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { ResourceNameFactory } from "../../../../../../src/plugins/resource/bot/utils/resourceNameFactory";

describe("Resource Name Factory", () => {
    describe("createCommonName", () => {
        it("Happy Path", () => {
            // Arrange
            const appName = "demo0329";
            const resourceNameSuffix = "abcdefg";
            const limit = 10;

            // Act
            const name = ResourceNameFactory.createCommonName(resourceNameSuffix, appName, limit);

            // Assert
            const expectName = "9btabcdefg";
            chai.assert.lengthOf(name, limit);
            chai.assert.isTrue(name === expectName);
        });
    });
});
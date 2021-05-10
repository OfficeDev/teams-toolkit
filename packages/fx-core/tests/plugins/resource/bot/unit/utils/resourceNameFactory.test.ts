// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import { ResourceNameFactory } from "../../../../../../src/plugins/resource/bot/utils/resourceNameFactory";
import * as utils from "../../../../../../src/plugins/resource/bot/utils/common";

describe("Resource Name Factory", () => {
    describe("createCommonName", () => {
        it("Undefined ResourceNameSuffix", () => {
            // Arrange
            const appName = "demo0329";
            const limit = 10;

            sinon.stub(utils, "genUUID").returns("abcdefg");

            // Act
            const name = ResourceNameFactory.createCommonName(appName, undefined, limit);

            // Assert
            const expectName = "9btabcdefg";
            chai.assert.lengthOf(name, limit);
            chai.assert.isTrue(name === expectName);
        });

        it("Valid ResourceNameSuffix", () => {
            // Arrange
            const appName = "demo0329";
            const resourceNameSuffix = "abcdefg";
            const limit = 10;

            // Act
            const name = ResourceNameFactory.createCommonName(appName, resourceNameSuffix, limit);

            // Assert
            const expectName = "9btabcdefg";
            chai.assert.lengthOf(name, limit);
            chai.assert.isTrue(name === expectName);
        });
    });
});
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { FunctionLanguage } from "../../src/enums";
import { FunctionPluginInfo } from "../../src/constants";
import { LanguageStrategyFactory } from "../../src/language-strategy";


describe(FunctionPluginInfo.pluginName, () => {
    describe("Function Language Strategy Test", () => {
        it("Test get CSharp language strategy", async () => {
            // Arrange
            const language = FunctionLanguage.CSharp;

            // Act
            const res = LanguageStrategyFactory.getStrategy(language);

            // Assert
            chai.assert.isTrue(res !== undefined);
        });

        it("Test get JavaScript language strategy", async () => {
            // Arrange
            const language = FunctionLanguage.JavaScript;

            // Act
            const res = LanguageStrategyFactory.getStrategy(language);

            // Assert
            chai.assert.isTrue(res !== undefined);
        });
    });
});

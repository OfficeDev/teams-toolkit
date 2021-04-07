// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { QuestionOptions } from "../../../../../src/plugins/resource/bot/constants";
import { ProgrammingLanguage } from "../../../../../src/plugins/resource/bot/enums/programmingLanguage";

describe("QuestionOptions", () => {
    describe("Programming Language Options", () => {
        it("Happy Path", async () => {
            // Arrange
            // Act
            const options = QuestionOptions.PROGRAMMING_LANGUAGE_OPTIONS;

            // Assert
            for (const item of options) {
                chai.assert.isTrue(Object.values(ProgrammingLanguage).map((value) => value as string).includes(item.label));
                chai.assert.isTrue(Object.values(ProgrammingLanguage).map((value) => value.toLowerCase()).includes(item.id));
            }
        });
    });
});
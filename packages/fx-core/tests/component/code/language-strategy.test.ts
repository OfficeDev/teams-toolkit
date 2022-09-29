// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { LanguageStrategyFactory } from "../../../src/component/code/api/language-strategy";
import { ProgrammingLanguage } from "../../../src/component/constants";

describe("Api function language strategy", () => {
  describe("Function Language Strategy Test", () => {
    it("Test get TypeScript language strategy", async () => {
      // Arrange
      const language = ProgrammingLanguage.TS;

      // Act
      const res = LanguageStrategyFactory.getStrategy(language);

      // Assert
      chai.assert.isTrue(res !== undefined);
    });

    it("Test get JavaScript language strategy", async () => {
      // Arrange
      const language = ProgrammingLanguage.JS;

      // Act
      const res = LanguageStrategyFactory.getStrategy(language);

      // Assert
      chai.assert.isTrue(res !== undefined);
    });
  });
});

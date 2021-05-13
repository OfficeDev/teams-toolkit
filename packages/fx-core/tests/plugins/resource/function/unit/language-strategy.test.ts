// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { FunctionLanguage } from "../../../../../src/plugins/resource/function/enums";
import { FunctionPluginInfo } from "../../../../../src/plugins/resource/function/constants";
import { LanguageStrategyFactory } from "../../../../../src/plugins/resource/function/language-strategy";

describe(FunctionPluginInfo.pluginName, () => {
  describe("Function Language Strategy Test", () => {
    it("Test get TypeScript language strategy", async () => {
      // Arrange
      const language = FunctionLanguage.TypeScript;

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

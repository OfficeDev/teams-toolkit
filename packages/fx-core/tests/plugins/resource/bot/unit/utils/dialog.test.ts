// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";

import { DialogUtils } from "../../../../../../src/plugins/resource/bot/utils/dialog";
import * as testUtils from "../utils";
import { Messages } from "../messages";
import { ProgrammingLanguage } from "../../../../../../src/plugins/resource/bot/enums/programmingLanguage";

describe("DialogUtils", () => {
  describe("Test output", () => {
    const pluginContext = testUtils.newPluginContext();
    pluginContext.dialog = testUtils.generateFakeDialog();
    it("Happy Path", async () => {
      // Arrange
      const message = "anything";

      // Act
      try {
        await DialogUtils.output(pluginContext, message);
      } catch {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });
  });

  describe("Test show", () => {
    const pluginContext = testUtils.newPluginContext();
    pluginContext.dialog = testUtils.generateFakeDialog();
    it("Happy Path", async () => {
      // Arrange
      const message = "anything";

      // Act
      try {
        await DialogUtils.show(pluginContext, message);
      } catch {
        chai.assert.fail(Messages.ShouldNotReachHere);
      }
    });
  });

  describe("Test ask", () => {
    const pluginContext = testUtils.newPluginContext();
    pluginContext.dialog = testUtils.generateFakeDialog();
    it("Happy Path", async () => {
      // Arrange
      const description = "anything";
      const defaultAnswer = "default";

      // Act
      const result = await DialogUtils.ask(pluginContext, description, defaultAnswer);

      // Assert
      chai.assert.isTrue(result === defaultAnswer);
    });
  });

  describe("Test askEnum", () => {
    const pluginContext = testUtils.newPluginContext();
    pluginContext.dialog = testUtils.generateFakeDialog();
    it("askEnum Returns Undefined", async () => {
      // Arrange
      const description = "anything";
      const defaultValue = ProgrammingLanguage.JavaScript;

      // Act
      const result = await DialogUtils.askEnum<ProgrammingLanguage>(
        pluginContext,
        description,
        ProgrammingLanguage,
        defaultValue
      );

      // Assert
      chai.assert.isTrue(result === undefined);
    });
  });
});

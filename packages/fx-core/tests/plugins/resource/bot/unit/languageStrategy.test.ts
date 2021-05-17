// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import { LanguageStrategy } from "../../../../../src/plugins/resource/bot/languageStrategy";
import { ProgrammingLanguage } from "../../../../../src/plugins/resource/bot/enums/programmingLanguage";
import { TemplateProjectsConstants } from "../../../../../src/plugins/resource/bot/constants";
import { Messages } from "./messages";
import { PluginError } from "../../../../../src/plugins/resource/bot/errors";

describe("Language Strategy", () => {
  describe("getTemplateProjectZip", () => {
    it("Fetch From Public Url", async () => {
      // Arrange
      const programmingLanguage = ProgrammingLanguage.JavaScript;
      const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;

      // Act
      const zip = await LanguageStrategy.getTemplateProjectZip(programmingLanguage, group_name);

      // Assert
      chai.assert.isNotNull(zip);
    });

    it("Fetch From Local", async () => {
      // Arrange
      const programmingLanguage = ProgrammingLanguage.JavaScript;
      const group_name = TemplateProjectsConstants.GROUP_NAME_BOT;
      sinon.stub(LanguageStrategy, "getTemplateProjectZipUrl").resolves("");

      // Act
      try {
        await LanguageStrategy.getTemplateProjectZip(programmingLanguage, group_name);
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      // Assert
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
  });

  describe("localBuild", () => {
    it("TypeScript Invalid PackDir", async () => {
      // Arrange
      const lang = ProgrammingLanguage.TypeScript;
      const packDir = "anything";

      // Act
      try {
        await LanguageStrategy.localBuild(lang, packDir);
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      // Assert
      chai.assert.fail(Messages.ShouldNotReachHere);
    });

    it("JavaScript Invalid PackDir", async () => {
      // Arrange
      const lang = ProgrammingLanguage.JavaScript;
      const packDir = "anything";

      // Act
      try {
        await LanguageStrategy.localBuild(lang, packDir);
      } catch (e) {
        chai.assert.isTrue(e instanceof PluginError);
        return;
      }

      // Assert
      chai.assert.fail(Messages.ShouldNotReachHere);
    });
  });
});

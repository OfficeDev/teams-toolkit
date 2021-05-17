// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import mock from "mock-fs";
import * as path from "path";

import { LanguageStrategy } from "../../../../../src/plugins/resource/bot/languageStrategy";
import { ProgrammingLanguage } from "../../../../../src/plugins/resource/bot/enums/programmingLanguage";
import { TemplateProjectsConstants } from "../../../../../src/plugins/resource/bot/constants";
import * as utils from "../../../../../src/plugins/resource/bot/utils/common";
import { Messages } from "./messages";
import { PluginError } from "../../../../../src/plugins/resource/bot/errors";
import { getTemplatesFolder } from "../../../../../../fx-core/src";
import AdmZip from "adm-zip";

describe("Language Strategy", () => {
  describe("getTemplateProjectZip", () => {
    before(() => {
      const commonPath = path.join(getTemplatesFolder(), "plugins", "resource", "bot");
      const botJsPath = path.join(
        commonPath,
        `${TemplateProjectsConstants.GROUP_NAME_BOT}.${utils.convertToLangKey(
          ProgrammingLanguage.JavaScript
        )}.${TemplateProjectsConstants.DEFAULT_SCENARIO_NAME}.zip`
      );

      const config: { [key: string]: any } = {};
      config[botJsPath] = new AdmZip().toBuffer();

      mock(config);
    });

    after(() => {
      mock.restore();
    });

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
      const zip = await LanguageStrategy.getTemplateProjectZip(programmingLanguage, group_name);

      // Assert
      chai.assert.isNotNull(zip);
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

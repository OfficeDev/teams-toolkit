// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as fs from "fs-extra";
import * as chai from "chai";
import * as path from "path";
import * as sinon from "sinon";
import AdmZip from "adm-zip";
import mock from "mock-fs";

import * as fetch from "../../../../../src/plugins/resource/function/utils/templates-fetch";
import {
  DependentPluginInfo,
  FunctionPluginInfo,
} from "../../../../../src/plugins/resource/function/constants";
import { FunctionPlugin } from "../../../../../src/plugins/resource/function/index";
import { FxResult } from "../../../../../src/plugins/resource/function/result";
import { QuestionKey } from "../../../../../src/plugins/resource/function/enums";
import { getTemplatesFolder } from "../../../../../src";
import { Platform } from "@microsoft/teamsfx-api";

const context: any = {
  configOfOtherPlugins: new Map<string, Map<string, string>>([
    [
      DependentPluginInfo.solutionPluginName,
      new Map<string, string>([
        [DependentPluginInfo.resourceGroupName, "ut"],
        [DependentPluginInfo.subscriptionId, "ut"],
        [DependentPluginInfo.resourceNameSuffix, "ut"],
        [DependentPluginInfo.programmingLanguage, "javascript"],
      ]),
    ],
  ]),
  app: {
    name: {
      short: "ut",
    },
  },
  projectSettings: {
    appName: "ut",
  },
  config: new Map(),
  root: path.join(__dirname, "ut"),
};

describe(FunctionPluginInfo.pluginName, () => {
  describe("Function Scaffold Test", () => {
    afterEach(() => {
      fs.emptyDirSync(context.root);
      fs.rmdirSync(context.root);
      sinon.restore();
    });

    before(() => {
      const config: any = {};
      config[
        path.join(
          getTemplatesFolder(),
          "plugins",
          "resource",
          "function",
          "function-base.js.default.zip"
        )
      ] = new AdmZip().toBuffer();
      config[
        path.join(
          getTemplatesFolder(),
          "plugins",
          "resource",
          "function",
          "function-triggers.js.HTTPTrigger.zip"
        )
      ] = new AdmZip().toBuffer();
      mock(config);
    });

    after(() => {
      mock.restore();
    });

    it("Test pre-scaffold without function name", async () => {
      // Arrange
      context.answers = { platform: Platform.VSCode };
      const plugin: FunctionPlugin = new FunctionPlugin();

      // Act
      const ret: FxResult = await plugin.preScaffold(context);

      // Assert
      chai.assert.isTrue(ret.isOk());
    });

    it("Test scaffold", async () => {
      // Arrange
      context.answers = context.answers = { platform: Platform.VSCode };
      context.answers[QuestionKey.functionName] = "httpTrigger";
      const zip = new AdmZip();
      zip.addFile("test.js.tpl", Buffer.from("{{appName}} {{functionName}}"));
      sinon.stub(fetch, "getTemplateURL").resolves(undefined);
      sinon.stub(fetch, "fetchZipFromURL").resolves(zip);

      const plugin: FunctionPlugin = new FunctionPlugin();

      // Act
      await plugin.preScaffold(context);
      const ret: FxResult = await plugin.scaffold(context);

      // Assert
      chai.assert.isTrue(ret.isOk());
    });

    it("Test scaffold with additional function", async () => {
      // Arrange
      context.answers = context.answers = { platform: Platform.VSCode };
      context.answers[QuestionKey.functionName] = "httpTrigger";
      const zip = new AdmZip();
      zip.addFile("test.js.tpl", Buffer.from("{{appName}} {{functionName}}"));
      sinon.stub(fetch, "getTemplateURL").resolves(undefined);
      sinon.stub(fetch, "fetchZipFromURL").resolves(zip);

      const plugin: FunctionPlugin = new FunctionPlugin();

      // Act
      await plugin.preScaffold(context);
      const ret: FxResult = await plugin.scaffold(context);

      // Assert
      chai.assert.isTrue(ret.isOk());
    });

    it("Test scaffold with fallback in JS", async () => {
      // Arrange
      context.answers = context.answers = { platform: Platform.VSCode };
      context.answers[QuestionKey.functionName] = "httpTrigger";
      sinon.stub(fetch, "getTemplateURL").rejects(new Error());
      const plugin: FunctionPlugin = new FunctionPlugin();

      // Act
      await plugin.preScaffold(context);
      const ret: FxResult = await plugin.scaffold(context);

      // Assert
      chai.assert.isTrue(ret.isOk());
    });
  });
});

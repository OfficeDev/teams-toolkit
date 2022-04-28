// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import { TeamsBotV2Impl } from "../../../../../../src/plugins/resource/bot/v2/plugin";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { Inputs } from "@microsoft/teamsfx-api";
import { newInputV2, newPluginContextV2 } from "../utils";
import sinon from "sinon";
import * as fetch from "../../../../../../src/common/template-utils/templatesUtils";
import mock from "mock-fs";
import AdmZip from "adm-zip";
import { getTemplatesFolder } from "../../../../../../src";
const fs = require("fs-extra");

describe("Bot Plugin v2", () => {
  let botPlugin: TeamsBotV2Impl;
  let context: Context;
  let inputs: Inputs;
  beforeEach(() => {
    botPlugin = new TeamsBotV2Impl();
    context = newPluginContextV2();
    inputs = newInputV2();
  });

  afterEach(() => {
    fs.emptyDirSync(inputs.projectPath);
    fs.rmdirSync(inputs.projectPath);
    sinon.restore();
  });

  describe("Test scaffoldSourceCode", () => {
    before(() => {
      const config: any = {};
      config[path.join(getTemplatesFolder(), "fallback", "tab.js.default.zip")] =
        new AdmZip().toBuffer();
      mock(config);
    });

    after(() => {
      mock.restore();
    });

    it("Happy Path", async () => {
      sinon.stub(fetch, "fetchTemplateUrl").resolves("");
      sinon.stub(fetch, "fetchZipFromUrl").resolves(new AdmZip());

      const result = await botPlugin.scaffoldSourceCode(context, inputs);
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("Test generateResourceTemplate", () => {
    it("Happy Path", async () => {
      const result = await botPlugin.generateResourceTemplate(context, inputs);
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("Test updateResourceTemplate", () => {
    it("Happy Path", async () => {
      const result = await botPlugin.updateResourceTemplate(context, inputs);
      chai.assert.isTrue(result.isOk());
    });
  });
});

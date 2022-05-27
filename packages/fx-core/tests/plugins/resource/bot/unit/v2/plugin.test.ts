// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as path from "path";
import { TeamsBotV2Impl } from "../../../../../../src/plugins/resource/bot/v2/plugin";
import { Context, DeploymentInputs } from "@microsoft/teamsfx-api/build/v2";
import { Inputs, IProgressHandler, TokenProvider, v2 } from "@microsoft/teamsfx-api";
import { newInputV2, newPluginContextV2 } from "../utils";
import * as sinon from "sinon";
import * as faker from "faker";
import * as fetch from "../../../../../../src/common/template-utils/templatesUtils";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import mock from "mock-fs";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import AdmZip from "adm-zip";
import { getTemplatesFolder } from "../../../../../../src";
import * as utils from "../../../../../../src/plugins/resource/bot/utils/common";
import { AzureHostingFactory } from "../../../../../../src/common/azure-hosting/hostingFactory";
import { ServiceType } from "../../../../../../src/common/azure-hosting/interfaces";

const fs = require("fs-extra");

describe("Bot Plugin v2", () => {
  let botPlugin: TeamsBotV2Impl;
  let context: Context;
  let inputs: Inputs;
  let env: v2.EnvInfoV2;
  let tokenProvider: TokenProvider;
  beforeEach(() => {
    botPlugin = new TeamsBotV2Impl();
    context = newPluginContextV2();
    inputs = newInputV2();
    env = {
      envName: "default",
      config: { manifest: { appName: { short: "test-app" } } },
      state: {
        "fx-resource-bot": {
          botWebAppResourceId:
            "resourceGroups/resource_group_name/providers/Microsoft.Web/sites/site_name",
        },
      },
    };
    tokenProvider = {} as TokenProvider;
  });
  class MockProgressHandler implements IProgressHandler {
    start(detail?: string): Promise<void> {
      return Promise.resolve();
    }
    next(detail?: string): Promise<void> {
      return Promise.resolve();
    }
    end(success: boolean): Promise<void> {
      return Promise.resolve();
    }
  }

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
      sinon.stub(fetch, "fetchTemplateUrl").resolves(faker.internet.url());
      sinon.stub(fetch, "fetchZipFromUrl").resolves(new AdmZip());
      const bar = new MockProgressHandler();
      context.userInteraction["createProgressBar"] = () => bar;

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

  describe("Test deploy", () => {
    after(() => {
      mock.restore();
    });

    it("Happy Path", async () => {
      const host = AzureHostingFactory.createHosting(ServiceType.Functions);
      const bar = new MockProgressHandler();
      context.userInteraction["createProgressBar"] = () => bar;
      sinon.stub(fs, "writeFile");
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "ensureDir");
      sinon.stub(fs, "readFile").resolves("aaa\nbbb");
      sinon.stub(fs, "readJSON").resolves({ env: { time: 1652929694515 } });
      sinon.stub(TeamsBotV2Impl, "needDeploy").resolves(true);
      // sinon.stub(context.userInteraction, "createProgressBar").resolves(bar);
      sinon.stub(bar, "start").resolves();
      sinon.stub(bar, "next").resolves();
      sinon.stub(bar, "end").resolves();
      sinon.stub(utils, "execute");
      sinon.stub(utils, "zipFolderAsync");
      sinon.stub(AzureHostingFactory, "createHosting").returns(host);
      sinon.stub(host, "deploy").resolves({});
      sinon.stub(fs, "writeJSON");
      const res = await botPlugin.deploy(context, inputs as DeploymentInputs, env, tokenProvider);
      chai.assert.isTrue(res.isOk());
    });
  });
});

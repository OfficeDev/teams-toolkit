// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import * as faker from "faker";
import * as path from "path";
import * as sinon from "sinon";
import mock from "mock-fs";
import { PluginContext } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import axios from "axios";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";

import { FrontendPathInfo } from "../../../../../src/plugins/resource/frontend/constants";
import { FrontendScaffold } from "../../../../../src/plugins/resource/frontend/ops/scaffold";
import {
  TemplateInfo,
  TemplateVariable,
} from "../../../../../src/plugins/resource/frontend/resources/templateInfo";
import { TestHelper } from "../helper";
import { getTemplatesFolder } from "../../../../../src";

chai.use(chaiAsPromised);

describe("FrontendScaffold", () => {
  describe("scaffoldFromZip", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const ensureDirStub = sinon.stub(fs, "ensureDir");
      const writeFileStub = sinon.stub<any, any>(fs, "writeFile");

      const zip = new AdmZip();
      const entryName: string = faker.system.filePath();
      const data = Buffer.from(faker.lorem.text());
      zip.addFile(entryName, data);

      const pluginContext: PluginContext = TestHelper.getFakePluginContext();
      const dstPath: string = path.join(pluginContext.root, FrontendPathInfo.WorkingDir);
      const filePath = path.join(dstPath, entryName);

      await FrontendScaffold.scaffoldFromZip(zip, dstPath);
      chai.assert.deepEqual(ensureDirStub.getCall(0).args, [path.dirname(filePath)]);
      chai.assert.deepEqual(writeFileStub.getCall(0).args, [filePath, data]);
    });
  });

  describe("fulfill", () => {
    it("happy path", async () => {
      const entryName: string = faker.system.filePath() + FrontendPathInfo.TemplateFileExt;
      const pluginContext: PluginContext = TestHelper.getFakePluginContext();
      const dstPath: string = path.join(pluginContext.root, FrontendPathInfo.WorkingDir);
      const filePath = path.join(dstPath, entryName);

      const rowData: string = faker.lorem.text();
      const data = rowData + "{{showFunction}}";
      const variables: TemplateVariable = {
        showFunction: true,
      };

      const result = FrontendScaffold.fulfill(filePath, Buffer.from(data), variables);
      chai.assert.equal(result, rowData + variables.showFunction);
    });
  });

  describe("getTemplateZip", () => {
    before(() => {
      const config: any = {};
      config[path.join(getTemplatesFolder(), FrontendPathInfo.TemplateDir, `tab.js.default.zip`)] =
        new AdmZip().toBuffer();
      mock(config);
    });

    after(() => {
      mock.restore();
    });

    it("fallback", async () => {
      sinon.stub(FrontendScaffold, "getTemplateURL").rejects();
      const pluginContext: PluginContext = TestHelper.getFakePluginContext();
      const templateInfo = new TemplateInfo(pluginContext);

      const zip = await FrontendScaffold.getTemplateZip(pluginContext, templateInfo);
      chai.assert.exists(zip);
    });
  });

  describe("fetchZipFromUrl", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      sinon.stub(axios, "get").resolves(TestHelper.getFakeAxiosResponse(""));
      const zip = await FrontendScaffold.fetchZipFromUrl(TestHelper.latestTemplateURL);
      chai.assert.exists(zip);
    });

    it("failed with error code", async () => {
      sinon.stub(axios, "get").resolves(TestHelper.getFakeAxiosResponse("", 404));
      await chai
        .expect(FrontendScaffold.fetchZipFromUrl(TestHelper.latestTemplateURL))
        .to.eventually.be.rejectedWith();
    });
  });

  describe("getTemplateURL", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("pick newest", async () => {
      sinon
        .stub(axios, "get")
        .resolves(TestHelper.getFakeAxiosResponse(TestHelper.getFakeTemplateManifest()));

      const url = await FrontendScaffold.getTemplateURL("", TestHelper.templateCompose);

      chai.assert.equal(url, TestHelper.latestTemplateURL);
    });
  });
});

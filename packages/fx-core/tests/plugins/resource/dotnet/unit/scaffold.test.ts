// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import * as faker from "faker";
import * as sinon from "sinon";
import { FxError, PluginContext, Result } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import chaiAsPromised from "chai-as-promised";
import * as fetch from "../../../../../src/common/template-utils/templatesUtils";

import { FrontendPlugin } from "../../../../../src/plugins/resource/frontend";
import { TestHelper } from "../helper";
import mock from "mock-fs";

chai.use(chaiAsPromised);

describe("DotnetPlugin", () => {
  describe("scaffold", () => {
    let frontendPlugin: FrontendPlugin;
    let pluginContext: PluginContext;

    beforeEach(async () => {
      pluginContext = TestHelper.getFakePluginContext();
      frontendPlugin = new FrontendPlugin();
    });

    afterEach(() => {
      sinon.restore();
    });

    before(() => {});

    after(() => {
      mock.restore();
    });

    it("happy path", async () => {
      sinon.stub(fetch, "fetchTemplateUrl").resolves(faker.internet.url());
      sinon.stub(fetch, "fetchZipFromUrl").resolves(new AdmZip());

      const result = await frontendPlugin.scaffold(pluginContext);

      chai.assert.isTrue(result.isOk());
    });
  });
});

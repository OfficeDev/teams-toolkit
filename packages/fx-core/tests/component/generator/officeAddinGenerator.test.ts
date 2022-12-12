// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3, Inputs, ok, Platform } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import fs from "fs-extra";
import "mocha";
import * as path from "path";
import * as sinon from "sinon";
import * as uuid from "uuid";
import { cpUtils } from "../../../src/common/deps-checker";
import { Generator } from "../../../src/component/generator/generator";
import { OfficeAddinGenerator } from "../../../src/component/generator/officeAddin/generator";
import {
  AddinLanguageQuestion,
  AddinProjectFolderQuestion,
  getQuestionsForScaffolding,
  getTemplate,
  OfficeHostQuestion,
} from "../../../src/component/generator/officeAddin/question";
import { GeneratorChecker } from "../../../src/component/resource/spfx/depsChecker/generatorChecker";
import { YoChecker } from "../../../src/component/resource/spfx/depsChecker/yoChecker";
import * as childProcess from "child_process";
import { Utils } from "../../../src/component/resource/spfx/utils/utils";
import { createContextV3, newProjectSettingsV3 } from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockTools } from "../../core/utils";
import { helperMethods } from "../../../src/component/generator/officeAddin/helperMethods";
import { OfficeAddinManifest } from "office-addin-manifest";

describe("OfficeAddinGenerator", function () {
  const testFolder = path.resolve("./tmp");
  let context: ContextV3;

  beforeEach(async () => {
    const gtools = new MockTools();
    setTools(gtools);
    context = createContextV3(newProjectSettingsV3());

    await fs.ensureDir(testFolder);
    sinon.stub(Utils, "configure");
    sinon.stub(fs, "stat").resolves();
    sinon.stub(YoChecker.prototype, "isInstalled").resolves(true);
    sinon.stub(GeneratorChecker.prototype, "isInstalled").resolves(true);
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");
    const manifestId = uuid.v4();
    sinon.stub(fs, "readFile").resolves(new Buffer(`{"id": "${manifestId}"}`));
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(fs, "rename").resolves();
    sinon.stub(fs, "copyFile").resolves();
    sinon.stub(fs, "remove").resolves();
    sinon.stub(fs, "readJson").resolves({});
    sinon.stub(fs, "ensureFile").resolves();
    sinon.stub(fs, "writeJSON").resolves();
  });

  it("should call both doScaffolding and template generator", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "office-addin-test",
    };
    const doScaffoldStub = sinon
      .stub(OfficeAddinGenerator, "doScaffolding")
      .resolves(ok(undefined));
    const generateTemplateStub = sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
    chai.expect(doScaffoldStub.calledOnce).to.be.true;
    chai.expect(generateTemplateStub.calledOnce).to.be.true;
  });

  it("should scaffold taskpane successfully on happy path", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "office-addin-test",
    };
    inputs["capabilities"] = ["taskpane"];
    inputs[AddinProjectFolderQuestion.name] = undefined;
    inputs[AddinLanguageQuestion.name] = "TypeScript";

    sinon.stub<any, any>(childProcess, "exec").callsFake(() => {
      return;
    });
    sinon.stub(helperMethods, "downloadProjectTemplateZipFile").resolves(undefined);
    sinon.stub(OfficeAddinManifest, "modifyManifestFile").resolves({});

    const result = await OfficeAddinGenerator.doScaffolding(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
  });

  afterEach(async () => {
    sinon.restore();
  });
});

describe("getQuestionsForScaffolding", () => {
  it("should contain all questions", () => {
    const q = getQuestionsForScaffolding();
    chai.expect(q.children?.length).to.eq(3);
  });
});

describe("getTemplate", () => {
  it("should find taskpane template", () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
    };
    inputs["capabilities"] = ["taskpane"];

    const template = getTemplate(inputs);
    chai.expect(template).to.eq("taskpane");
  });
});

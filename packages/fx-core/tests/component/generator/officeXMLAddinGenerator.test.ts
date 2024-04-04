// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author zyun@microsoft.com
 */

import { Context, Inputs, ok, Platform, err, SystemError } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import * as childProcess from "child_process";
import fs from "fs";
import fse from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import { OfficeAddinManifest } from "office-addin-manifest";
import * as path from "path";
import * as sinon from "sinon";
import * as uuid from "uuid";
import { cpUtils } from "../../../src/common/deps-checker";
import { Generator } from "../../../src/component/generator/generator";
import { OfficeXMLAddinGenerator } from "../../../src/component/generator/officeXMLAddin/generator";
import { HelperMethods } from "../../../src/component/generator/officeAddin/helperMethods";
import { createContextV3 } from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { OfficeAddinHostOptions, ProjectTypeOptions, QuestionNames } from "../../../src/question";
import { MockTools } from "../../core/utils";
import { FeatureFlagName } from "../../../src/common/constants";
import { getOfficeAddinTemplateConfig } from "../../../src/component/generator/officeXMLAddin/projectConfig";

describe("OfficeXMLAddinGenerator", function () {
  const testFolder = path.resolve("./tmp");
  let context: Context;
  let mockedEnvRestore: RestoreFn;
  const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");

  beforeEach(async () => {
    mockedEnvRestore = mockedEnv(
      { TEAMSFX_V3: "true", [FeatureFlagName.OfficeXMLAddin]: "true" },
      { clear: true }
    );
    const gtools = new MockTools();
    setTools(gtools);
    context = createContextV3();

    await fse.ensureDir(testFolder);
    sinon.stub(fs, "stat").resolves();
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");
    const manifestId = uuid.v4();
    sinon.stub(fs, "readFile").resolves(new Buffer(`{"id": "${manifestId}"}`));
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(fs, "rename").resolves();
    sinon.stub(fs, "copyFile").resolves();
    sinon.stub(fse, "remove").resolves();
    sinon.stub(fse, "readJson").resolves({});
    sinon.stub(fse, "ensureFile").resolves();
    sinon.stub(fse, "writeJSON").resolves();
  });

  afterEach(async () => {
    sinon.restore();
    mockedEnvRestore();
    if (await fse.pathExists(testFolder)) {
      await fse.rm(testFolder, { recursive: true });
    }
  });

  it("should run childProcessExec command success", async function () {
    sinon.stub(childProcess, "exec").yields(`echo 'test'`, "test");
    chai.assert(await OfficeXMLAddinGenerator.childProcessExec(`echo 'test'`), "test");
  });

  it("should throw error once command fail", async function () {
    try {
      await OfficeXMLAddinGenerator.childProcessExec("exit -1");
    } catch (err) {
      chai.assert(err.message, "Command failed: exit -1");
    }
  });

  it("should success when generate normal project on happy path", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [QuestionNames.ProjectType]: ProjectTypeOptions.officeXMLAddin().id,
      [QuestionNames.OfficeAddinHost]: OfficeAddinHostOptions.word().id,
      [QuestionNames.Capabilities]: "word-taskpane",
      [QuestionNames.AppName]: "office-addin-test",
      [QuestionNames.OfficeAddinFolder]: undefined,
      [QuestionNames.ProgrammingLanguage]: "typescript",
    };

    sinon.stub(HelperMethods, "downloadProjectTemplateZipFile").resolves(undefined);
    sinon.stub(OfficeXMLAddinGenerator, "childProcessExec").resolves();
    sinon.stub(OfficeAddinManifest, "modifyManifestFile").resolves({});
    sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));
    const result = await OfficeXMLAddinGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
  });

  it("should success when generate manifest-only project on happy path", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [QuestionNames.ProjectType]: ProjectTypeOptions.officeXMLAddin().id,
      [QuestionNames.OfficeAddinHost]: OfficeAddinHostOptions.word().id,
      [QuestionNames.Capabilities]: "word-manifest",
      [QuestionNames.AppName]: "office-addin-test",
      [QuestionNames.OfficeAddinFolder]: undefined,
      [QuestionNames.ProgrammingLanguage]: "javascript",
    };

    sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sinon.stub(OfficeAddinManifest, "modifyManifestFile").resolves({});
    const result = await OfficeXMLAddinGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
  });

  it("should failed when generate manifest-only project on happy path when download failed", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [QuestionNames.ProjectType]: ProjectTypeOptions.officeXMLAddin().id,
      [QuestionNames.OfficeAddinHost]: OfficeAddinHostOptions.word().id,
      [QuestionNames.Capabilities]: ["react"],
      [QuestionNames.AppName]: "office-addin-test",
      [QuestionNames.OfficeAddinFolder]: undefined,
      [QuestionNames.ProgrammingLanguage]: "typescript",
    };

    sinon.stub(HelperMethods, "downloadProjectTemplateZipFile").rejects(undefined);
    sinon.stub(OfficeAddinManifest, "modifyManifestFile").resolves({});
    const result = await OfficeXMLAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(result.isErr());
  });

  it("should failed when get manifest-only failed", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [QuestionNames.ProjectType]: ProjectTypeOptions.officeXMLAddin().id,
      [QuestionNames.OfficeAddinHost]: OfficeAddinHostOptions.word().id,
      [QuestionNames.Capabilities]: ["word-manifest"],
      [QuestionNames.AppName]: "office-addin-test",
      [QuestionNames.OfficeAddinFolder]: undefined,
      [QuestionNames.ProgrammingLanguage]: "javascript",
    };

    sinon.stub(Generator, "generateTemplate").onCall(0).resolves(err(mockedError));
    const result = await OfficeXMLAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(result.isErr());
  });

  it("should failed when get readme failed", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [QuestionNames.ProjectType]: ProjectTypeOptions.officeXMLAddin().id,
      [QuestionNames.OfficeAddinHost]: OfficeAddinHostOptions.word().id,
      [QuestionNames.Capabilities]: ["word-manifest"],
      [QuestionNames.AppName]: "office-addin-test",
      [QuestionNames.OfficeAddinFolder]: undefined,
      [QuestionNames.ProgrammingLanguage]: "javascript",
    };

    const generatorStub = sinon.stub(Generator, "generateTemplate");
    generatorStub.onCall(0).resolves(ok(undefined));
    generatorStub.onCall(1).resolves(err(mockedError));
    const result = await OfficeXMLAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(result.isErr());
  });

  it("should failed when gen yml failed", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [QuestionNames.ProjectType]: ProjectTypeOptions.officeXMLAddin().id,
      [QuestionNames.OfficeAddinHost]: OfficeAddinHostOptions.word().id,
      [QuestionNames.Capabilities]: ["word-manifest"],
      [QuestionNames.AppName]: "office-addin-test",
      [QuestionNames.OfficeAddinFolder]: undefined,
      [QuestionNames.ProgrammingLanguage]: "javascript",
    };

    const generatorStub = sinon.stub(Generator, "generateTemplate");
    generatorStub.onCall(0).resolves(ok(undefined));
    generatorStub.onCall(1).resolves(ok(undefined));
    generatorStub.onCall(2).resolves(err(mockedError));
    sinon.stub(OfficeAddinManifest, "modifyManifestFile").resolves({});
    const result = await OfficeXMLAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(result.isErr());
  });
});

describe("getOfficeAddinTemplateConfig", () => {
  it("should return empty repo info if manifest-only project", () => {
    const config = getOfficeAddinTemplateConfig(ProjectTypeOptions.officeXMLAddin().id, "excel");
    chai.assert.equal(config["excel-manifest"].framework?.default?.typescript, undefined);
    chai.assert.equal(
      config["excel-react"].framework?.default?.typescript,
      "https://aka.ms/ccdevx-fx-react-ts"
    );
  });
});

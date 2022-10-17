// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ContextV3,
  InputsWithProjectPath,
  ok,
  Platform,
  Stage,
  Void,
} from "@microsoft/teamsfx-api";
import { expect } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv from "mocked-env";
import * as path from "path";
import * as sinon from "sinon";
import * as uuid from "uuid";
import { SPFxTabCodeProvider } from "../../../../../src/component/code/spfxTabCode";
import { ComponentNames } from "../../../../../src/component/constants";
import { DefaultManifestProvider } from "../../../../../src/component/resource/appManifest/manifestProvider";
import { createContextV3, newProjectSettingsV3 } from "../../../../../src/component/utils";
import { setTools } from "../../../../../src/core/globalVars";
import { GeneratorChecker } from "../../../../../src/component/resource/spfx/depsChecker/generatorChecker";
import { YoChecker } from "../../../../../src/component/resource/spfx/depsChecker/yoChecker";
import { SPFXQuestionNames } from "../../../../../src/component/resource/spfx/utils/questions";
import { Utils } from "../../../../../src/component/resource/spfx/utils/utils";
import { cpUtils } from "../../../../../src/component/utils/depsChecker/cpUtils";
import { MockTools, MockUserInteraction } from "../../../../core/utils";

describe("SPFxScaffold", function () {
  const testFolder = path.resolve("./tmp");
  let fakedAddCapability;
  let component: SPFxTabCodeProvider;
  let context: ContextV3;
  const manifestProvider = new DefaultManifestProvider();
  beforeEach(async () => {
    component = new SPFxTabCodeProvider();
    const gtools = new MockTools();
    setTools(gtools);
    context = createContextV3(newProjectSettingsV3());
    context.projectSetting.components = [
      {
        name: "teams-tab",
        hosting: ComponentNames.SPFx,
        deploy: true,
        folder: "SPFx",
        build: true,
      },
    ];
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
    sinon.stub(DefaultManifestProvider.prototype, "updateCapability").resolves(ok(Void));
  });

  it("scaffold SPFx project without framework", async function () {
    sinon.stub(fs, "pathExists").resolves(true);
    const inputs: InputsWithProjectPath = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [SPFXQuestionNames.framework_type]: "none",
      [SPFXQuestionNames.webpart_desp]: "test",
      [SPFXQuestionNames.webpart_name]: "hello",
    };
    const result = await component.generate(context, inputs);
    if (result.isErr()) console.log(result.error);
    expect(result.isOk()).to.eq(true);
  });

  it("scaffold SPFx project with react framework", async function () {
    sinon.stub(fs, "pathExists").resolves(true);
    const inputs: InputsWithProjectPath = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [SPFXQuestionNames.framework_type]: "react",
      [SPFXQuestionNames.webpart_desp]: "test",
      [SPFXQuestionNames.webpart_name]: "hello",
    };
    const result = await component.generate(context, inputs);
    if (result.isErr()) console.log(result.error);
    expect(result.isOk()).to.eq(true);
  });

  it("scaffold SPFx project with minimal framework", async function () {
    sinon.stub(fs, "pathExists").resolves(true);
    const inputs: InputsWithProjectPath = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [SPFXQuestionNames.framework_type]: "minimal",
      [SPFXQuestionNames.webpart_desp]: "test",
      [SPFXQuestionNames.webpart_name]: "hello",
    };
    const result = await component.generate(context, inputs);
    if (result.isErr()) console.log(result.error);
    expect(result.isOk()).to.eq(true);
  });

  it("scaffold SPFx project with extremely long webpart name", async function () {
    sinon.stub(fs, "pathExists").resolves(true);
    const inputs: InputsWithProjectPath = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [SPFXQuestionNames.framework_type]: "react",
      [SPFXQuestionNames.webpart_name]:
        "extremelylongextremelylongextremelylongextremelylongspfxwebpartname",
      [SPFXQuestionNames.webpart_desp]: "test",
    };
    const result = await component.generate(context, inputs);
    if (result.isErr()) console.log(result.error);
    expect(result.isOk()).to.eq(true);
  });

  it("add webpart to SPFx project framework", async function () {
    sinon.stub(fs, "pathExists").resolves(true);
    const mockedEnvRestore = mockedEnv({ TEAMSFX_SPFX_MULTI_TAB: "true" });
    const inputs: InputsWithProjectPath = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [SPFXQuestionNames.framework_type]: "react",
      stage: Stage.addFeature,
    };
    context.userInteraction = new MockUserInteraction();
    context.manifestProvider = manifestProvider;
    fakedAddCapability = sinon.stub(manifestProvider, "addCapabilities").resolves(ok(Void));
    const result = await component.generate(context, inputs);
    if (result.isErr()) console.log(result.error);
    expect(result.isOk()).to.eq(true);
    expect(fakedAddCapability.calledOnce).to.eq(true);
    mockedEnvRestore();
  });

  it("add webpart to SPFx project without configuration file", async function () {
    sinon.stub(fs, "pathExists").callsFake((directory) => {
      if (directory.includes(".yo-rc.json")) {
        return false;
      }
      return true;
    });
    const mockedEnvRestore = mockedEnv({ TEAMSFX_SPFX_MULTI_TAB: "true" });
    const inputs: InputsWithProjectPath = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [SPFXQuestionNames.framework_type]: "react",
      stage: Stage.addFeature,
    };
    context.userInteraction = new MockUserInteraction();
    context.manifestProvider = manifestProvider;
    fakedAddCapability = sinon.stub(manifestProvider, "addCapabilities").resolves(ok(Void));
    try {
      await component.generate(context, inputs);
    } catch (e) {
      chai.expect(e.name).equal("NoConfigurationFile");
    }
    mockedEnvRestore();
  });

  afterEach(async () => {
    sinon.restore();
    await fs.remove(testFolder);
  });
});

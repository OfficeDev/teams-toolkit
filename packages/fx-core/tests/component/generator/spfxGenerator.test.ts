// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ContextV3, err, Inputs, ok, Platform, SystemError } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as path from "path";
import * as sinon from "sinon";
import * as uuid from "uuid";
import { cpUtils } from "../../../src/common/deps-checker";
import { Generator } from "../../../src/component/generator/generator";
import { SPFxGenerator } from "../../../src/component/generator/spfxGenerator";
import { GeneratorChecker } from "../../../src/component/resource/spfx/depsChecker/generatorChecker";
import { YoChecker } from "../../../src/component/resource/spfx/depsChecker/yoChecker";
import {
  PackageSelectOptionsHelper,
  SPFxVersionOptionIds,
} from "../../../src/component/resource/spfx/utils/question-helper";
import { SPFXQuestionNames } from "../../../src/component/resource/spfx/utils/questions";
import { Utils } from "../../../src/component/resource/spfx/utils/utils";
import { createContextV3, newProjectSettingsV3 } from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockTools } from "../../core/utils";

describe("SPFxGenerator", function () {
  const testFolder = path.resolve("./tmp");
  let context: ContextV3;
  let mockedEnvRestore: RestoreFn | undefined;

  beforeEach(async () => {
    const gtools = new MockTools();
    setTools(gtools);
    context = createContextV3(newProjectSettingsV3());

    await fs.ensureDir(testFolder);
    sinon.stub(Utils, "configure");
    sinon.stub(fs, "stat").resolves();
    sinon.stub(YoChecker.prototype, "isInstalled").resolves(true);
    sinon.stub(GeneratorChecker.prototype, "isInstalled").resolves(true);

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

  afterEach(async () => {
    sinon.restore();
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
  });

  it("Both yeoman generator and template generator is called when scaffold SPFx project", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
    };
    const doYeomanScaffoldStub = sinon
      .stub(SPFxGenerator, "doYeomanScaffold" as any)
      .resolves(ok(undefined));
    const generateTemplateStub = sinon
      .stub(Generator, "generateTemplate" as any)
      .resolves(ok(undefined));
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
    chai.expect(doYeomanScaffoldStub.calledOnce).to.be.true;
    chai.expect(generateTemplateStub.calledOnce).to.be.true;
  });

  it("scaffold SPFx project without framework", async function () {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(Generator, "generateTemplate" as any).resolves(ok(undefined));
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [SPFXQuestionNames.framework_type]: "none",
      [SPFXQuestionNames.webpart_desp]: "test",
      [SPFXQuestionNames.webpart_name]: "hello",
      "app-name": "spfxTestApp",
    };
    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
  });

  it("scaffold SPFx project with react framework", async function () {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");
    sinon.stub(Generator, "generateTemplate" as any).resolves(ok(undefined));
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [SPFXQuestionNames.framework_type]: "react",
      [SPFXQuestionNames.webpart_desp]: "test",
      [SPFXQuestionNames.webpart_name]: "hello",
      "app-name": "spfxTestApp",
    };
    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
  });

  it("scaffold SPFx project with minimal framework", async function () {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");
    sinon.stub(Generator, "generateTemplate" as any).resolves(ok(undefined));
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [SPFXQuestionNames.framework_type]: "minimal",
      [SPFXQuestionNames.webpart_desp]: "test",
      [SPFXQuestionNames.webpart_name]: "hello",
      "app-name": "spfxTestApp",
    };
    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
  });

  it("scaffold SPFx project with extremely long webpart name", async function () {
    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");
    sinon.stub(Generator, "generateTemplate" as any).resolves(ok(undefined));
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [SPFXQuestionNames.framework_type]: "minimal",
      [SPFXQuestionNames.webpart_desp]: "test",
      [SPFXQuestionNames.webpart_name]:
        "extremelylongextremelylongextremelylongextremelylongspfxwebpartname",
      "app-name": "spfxTestApp",
    };
    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
  });

  it("select to install locally but no need to install", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
      [SPFXQuestionNames.use_global_package_or_install_local]: SPFxVersionOptionIds.installLocally,
    };
    sinon.stub(YoChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(GeneratorChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");

    const generateTemplateStub = sinon
      .stub(Generator, "generateTemplate" as any)
      .resolves(ok(undefined));

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);

    chai.expect(generateTemplateStub.calledOnce).to.be.true;
  });

  it("select to install locally and install only sp", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
      [SPFXQuestionNames.use_global_package_or_install_local]: SPFxVersionOptionIds.installLocally,
    };
    sinon.stub(YoChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");
    sinon.stub(GeneratorChecker.prototype, "isLatestInstalled").resolves(false);
    const yoInstaller = sinon
      .stub(YoChecker.prototype, "ensureLatestDependency")
      .resolves(ok(true));
    const generatorInstaller = sinon
      .stub(GeneratorChecker.prototype, "ensureLatestDependency")
      .resolves(ok(true));

    const generateTemplateStub = sinon
      .stub(Generator, "generateTemplate" as any)
      .resolves(ok(undefined));

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);

    chai.expect(generateTemplateStub.calledOnce).to.be.true;
    chai.expect(yoInstaller.calledOnce).to.be.false;
    chai.expect(generatorInstaller.calledOnce).to.be.true;
  });

  it("select to install locally and install only yo", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
      [SPFXQuestionNames.use_global_package_or_install_local]: SPFxVersionOptionIds.installLocally,
    };
    sinon.stub(YoChecker.prototype, "isLatestInstalled").resolves(false);
    sinon.stub(GeneratorChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");
    const yoInstaller = sinon
      .stub(YoChecker.prototype, "ensureLatestDependency")
      .resolves(ok(true));
    const generatorInstaller = sinon
      .stub(GeneratorChecker.prototype, "ensureLatestDependency")
      .resolves(ok(true));

    const generateTemplateStub = sinon
      .stub(Generator, "generateTemplate" as any)
      .resolves(ok(undefined));

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);

    chai.expect(generateTemplateStub.calledOnce).to.be.true;
    chai.expect(yoInstaller.calledOnce).to.be.true;
    chai.expect(generatorInstaller.calledOnce).to.be.false;
  });

  it("select to install locally and install sp error", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
      [SPFXQuestionNames.use_global_package_or_install_local]: SPFxVersionOptionIds.installLocally,
    };
    sinon.stub(YoChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(GeneratorChecker.prototype, "isLatestInstalled").resolves(false);
    sinon.stub(YoChecker.prototype, "ensureLatestDependency").resolves(ok(true));
    sinon
      .stub(GeneratorChecker.prototype, "ensureLatestDependency")
      .resolves(err(new SystemError("source", "name", "msg", "msg")));

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
    if (result.isErr()) {
      chai.expect(result.error.name).equal("LatestPackageInstallFailed");
    }
  });

  it("select to install locally and install yo error", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
      [SPFXQuestionNames.use_global_package_or_install_local]: SPFxVersionOptionIds.installLocally,
    };
    sinon.stub(YoChecker.prototype, "isLatestInstalled").resolves(false);
    sinon.stub(GeneratorChecker.prototype, "isLatestInstalled").resolves(true);
    sinon
      .stub(YoChecker.prototype, "ensureLatestDependency")
      .resolves(err(new SystemError("source", "name", "msg", "msg")));

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
    if (result.isErr()) {
      chai.expect(result.error.name).equal("LatestPackageInstallFailed");
    }
  });

  it("Yeoman Generator scaffolding error", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
      [SPFXQuestionNames.use_global_package_or_install_local]: SPFxVersionOptionIds.installLocally,
    };
    sinon.stub(YoChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(GeneratorChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(cpUtils, "executeCommand").throws(new Error("errorMessage"));
    sinon.stub(Generator, "generateTemplate" as any).resolves(ok(undefined));

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
  });

  it("install locally and use path", async function () {
    mockedEnvRestore = mockedEnv({
      PATH: undefined,
    });
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
      [SPFXQuestionNames.use_global_package_or_install_local]: SPFxVersionOptionIds.installLocally,
    };
    sinon.stub(YoChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(GeneratorChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");

    const generateTemplateStub = sinon
      .stub(Generator, "generateTemplate" as any)
      .resolves(ok(undefined));

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);

    chai.expect(generateTemplateStub.calledOnce).to.be.true;
  });

  it("use global packages and use path", async function () {
    mockedEnvRestore = mockedEnv({
      PATH: undefined,
    });
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
      [SPFXQuestionNames.use_global_package_or_install_local]: SPFxVersionOptionIds.globalPackage,
    };
    sinon.stub(YoChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(PackageSelectOptionsHelper, "isLowerThanRecommendedVersion").resolves(true);
    sinon.stub(GeneratorChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(cpUtils, "executeCommand").resolves("succeed");

    const generateTemplateStub = sinon
      .stub(Generator, "generateTemplate" as any)
      .resolves(ok(undefined));

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);

    chai.expect(generateTemplateStub.calledOnce).to.be.true;
  });
});

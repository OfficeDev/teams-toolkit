// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, err, Inputs, ok, Platform, SystemError } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import * as path from "path";
import * as sinon from "sinon";
import * as uuid from "uuid";
import { cpUtils } from "../../../src/common/deps-checker";
import { ManifestUtils } from "../../../src/component/driver/teamsApp/utils/ManifestUtils";
import { Generator } from "../../../src/component/generator/generator";
import { GeneratorChecker } from "../../../src/component/generator/spfx/depsChecker/generatorChecker";
import { YoChecker } from "../../../src/component/generator/spfx/depsChecker/yoChecker";
import { SPFxGenerator } from "../../../src/component/generator/spfx/spfxGenerator";
import { Utils } from "../../../src/component/generator/spfx/utils/utils";
import { createContextV3 } from "../../../src/component/utils";
import { envUtil } from "../../../src/component/utils/envUtil";
import { setTools } from "../../../src/core/globalVars";
import { QuestionNames, SPFxVersionOptionIds } from "../../../src/question";
import { MockTools } from "../../core/utils";

describe("SPFxGenerator", function () {
  const testFolder = path.resolve("./tmp");
  let context: Context;
  let mockedEnvRestore: RestoreFn | undefined;

  beforeEach(async () => {
    const gtools = new MockTools();
    setTools(gtools);
    context = createContextV3();

    await fs.ensureDir(testFolder);
    sinon.stub(Utils, "configure");

    const manifestId = uuid.v4();
    sinon
      .stub(fs, "readFile")
      .resolves(
        new Buffer(
          `{"id": "${manifestId}", "preconfiguredEntries": [{"title": {"default": "helloworld"}}]}`
        )
      );
    sinon.stub(fs, "writeFile").resolves();
    sinon.stub(fs, "rename").resolves();
    sinon.stub(fs, "copyFile").resolves();
    sinon.stub(fs, "remove").resolves();
    sinon.stub(fs, "readJson").callsFake((directory: string) => {
      if (directory.includes("teams")) {
        return {
          $schema:
            "https://developer.microsoft.com/en-us/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
          manifestVersion: "1.16",
          id: "fakedId",
          icons: {
            color: "color.png",
            outline: "outline.png",
          },
          staticTabs: [],
          configurableTabs: [],
        };
      } else if (directory.includes(".yo-rc.json")) {
        return { "@microsoft/generator-sharepoint": { solutionName: "fakedSolutionName" } };
      } else {
        return { id: "fakedid", preconfiguredEntries: [{ title: { default: "helloworld" } }] };
      }
    });
    sinon.stub(fs, "ensureFile").resolves();
    sinon.stub(fs, "writeJSON").resolves();
    sinon.stub(fs, "ensureDir").resolves();
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
      "spfx-solution": "new",
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
      [QuestionNames.SPFxFramework]: "none",
      [QuestionNames.SPFxWebpartDesc]: "test",
      [QuestionNames.SPFxWebpartName]: "hello",
      "app-name": "spfxTestApp",
      "spfx-solution": "new",
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
      [QuestionNames.SPFxFramework]: "react",
      [QuestionNames.SPFxWebpartDesc]: "test",
      [QuestionNames.SPFxWebpartName]: "hello",
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxSolution]: "new",
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
      [QuestionNames.SPFxFramework]: "minimal",
      [QuestionNames.SPFxWebpartDesc]: "test",
      [QuestionNames.SPFxWebpartName]: "hello",
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxSolution]: "new",
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
      [QuestionNames.SPFxFramework]: "minimal",
      [QuestionNames.SPFxWebpartDesc]: "test",
      [QuestionNames.SPFxWebpartName]:
        "extremelylongextremelylongextremelylongextremelylongspfxwebpartname",
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxSolution]: "new",
    };
    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
  });

  it("select to install locally but no need to install", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxInstallPackage]: SPFxVersionOptionIds.installLocally,
      [QuestionNames.SPFxSolution]: "new",
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
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxInstallPackage]: SPFxVersionOptionIds.installLocally,
      [QuestionNames.SPFxSolution]: "new",
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
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxInstallPackage]: SPFxVersionOptionIds.installLocally,
      [QuestionNames.SPFxSolution]: "new",
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
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxInstallPackage]: SPFxVersionOptionIds.installLocally,
      [QuestionNames.SPFxSolution]: "new",
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
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxInstallPackage]: SPFxVersionOptionIds.installLocally,
      [QuestionNames.SPFxSolution]: "new",
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
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxInstallPackage]: SPFxVersionOptionIds.installLocally,
      [QuestionNames.SPFxSolution]: "new",
    };
    sinon.stub(YoChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(GeneratorChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(cpUtils, "executeCommand").throws(new Error("errorMessage"));
    sinon.stub(Generator, "generateTemplate" as any).resolves(ok(undefined));

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
  });

  it("Yeoman Generator scaffolding error with unknown", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxInstallPackage]: SPFxVersionOptionIds.installLocally,
      [QuestionNames.SPFxSolution]: "new",
    };
    sinon.stub(YoChecker.prototype, "isLatestInstalled").resolves(false);
    sinon.stub(GeneratorChecker.prototype, "isLatestInstalled").resolves(true);
    sinon.stub(cpUtils, "executeCommand").throws(new Error("errorMessage"));
    sinon.stub(Generator, "generateTemplate" as any).resolves(ok(undefined));
    sinon.stub(YoChecker.prototype, "ensureLatestDependency").throws(new Error("unknown"));

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
    if (result.isErr()) {
      chai.expect(result.error.name).equal("SPFxScaffoldError");
    }
  });

  it("install locally and use path", async function () {
    mockedEnvRestore = mockedEnv({
      PATH: undefined,
    });
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxInstallPackage]: SPFxVersionOptionIds.installLocally,
      [QuestionNames.SPFxSolution]: "new",
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
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxInstallPackage]: SPFxVersionOptionIds.globalPackage,
      [QuestionNames.SPFxSolution]: "new",
      globalSpfxPackageVersion: "1.17.0",
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

  it("No web part in imported SPFx solution", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxSolution]: "import",
      [QuestionNames.SPFxFolder]: "c:\\test",
    };

    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readdir").resolves([]);
    sinon.stub(fs, "copy").resolves();

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
    if (result.isErr()) {
      chai.expect(result.error.name).to.eq("RetrieveSPFxInfoFailed");
    }
  });

  it("Copy existing SPFx solution failed when import SPFx solution", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
      "spfx-solution": "import",
      "spfx-folder": "c:\\test",
    };

    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readdir").resolves([]);
    sinon.stub(fs, "copy").throwsException("Failed to copy");

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
    if (result.isErr()) {
      chai.expect(result.error.name).to.eq("CopyExistingSPFxSolutioinFailed");
    }
  });

  it("Update SPFx template failed when import SPFx solution", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
      "app-name": "spfxTestApp",
      "spfx-solution": "import",
      "spfx-folder": "c:\\test",
    };

    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readdir").callsFake((directory: any) => {
      if (directory === path.join("c:\\test", "teams")) {
        return ["1_color.png", "1_outline.png"] as any;
      } else {
        return ["helloworld", "second"] as any;
      }
    });
    sinon.stub(fs, "statSync").returns({
      isDirectory: () => {
        return true;
      },
    } as any);
    sinon.stub(fs, "copy").resolves();
    sinon.stub(Generator, "generateTemplate" as any).resolves(ok(undefined));
    sinon
      .stub(ManifestUtils.prototype, "_readAppManifest")
      .throwsException("Failed to read manifest");

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
    if (result.isErr()) {
      chai.expect(result.error.name).to.eq("UpdateSPFxTemplateFailed");
    }
  });

  it("Generate template fail when import SPFx solution", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxSolution]: "import",
      [QuestionNames.SPFxFolder]: "c:\\test",
    };

    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readdir").resolves(["helloworld", "second"] as any);
    sinon.stub(fs, "statSync").returns({
      isDirectory: () => {
        return true;
      },
    } as any);
    const generateTemplateStub = sinon
      .stub(Generator, "generateTemplate" as any)
      .resolves(err(undefined));
    sinon.stub(fs, "copy").resolves();

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
    chai.expect(generateTemplateStub.calledOnce).to.eq(true);
  });

  it("Teams manifest staticTabs is updated if imported SPFx solution has multiple web parts", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: testFolder,
      [QuestionNames.AppName]: "spfxTestApp",
      [QuestionNames.SPFxSolution]: "import",
      [QuestionNames.SPFxFolder]: "c:\\test",
    };

    sinon.stub(fs, "pathExists").resolves(true);
    sinon.stub(fs, "readdir").callsFake((directory: any) => {
      if (directory === path.join("c:\\test", "teams")) {
        return ["1_color.png", "1_outline.png"] as any;
      } else {
        return ["helloworld", "second"] as any;
      }
    });
    sinon.stub(fs, "statSync").returns({
      isDirectory: () => {
        return true;
      },
    } as any);
    const generateTemplateStub = sinon
      .stub(Generator, "generateTemplate" as any)
      .resolves(ok(undefined));
    const fakedManifest = { staticTabs: [{ name: "default" }] };
    const readAppManifestStub = sinon
      .stub(ManifestUtils.prototype, "_readAppManifest")
      .resolves(ok(fakedManifest as any));
    const writeAppManifestStub = sinon
      .stub(ManifestUtils.prototype, "_writeAppManifest")
      .resolves();
    const writeEnvStub = sinon.stub(envUtil, "writeEnv");
    sinon.stub(fs, "copy").resolves();

    const result = await SPFxGenerator.generate(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
    chai.expect(fakedManifest.staticTabs.length).to.eq(3);
    chai.expect(generateTemplateStub.calledOnce).to.eq(true);
    chai.expect(writeEnvStub.calledOnce).to.eq(true);
    chai.expect(readAppManifestStub.calledTwice).to.eq(true);
    chai.expect(writeAppManifestStub.calledTwice).to.eq(true);
  });
});

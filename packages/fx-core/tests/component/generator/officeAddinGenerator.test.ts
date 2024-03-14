// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yefuwang@microsoft.com
 */

import {
  Context,
  devPreview,
  err,
  Inputs,
  ManifestUtil,
  ok,
  Platform,
  SystemError,
} from "@microsoft/teamsfx-api";
import * as chai from "chai";
import * as childProcess from "child_process";
import EventEmitter from "events";
import fs from "fs";
import fse from "fs-extra";
import "mocha";
import mockfs from "mock-fs";
import mockedEnv, { RestoreFn } from "mocked-env";
import { OfficeAddinManifest } from "office-addin-manifest";
import * as path from "path";
import proxyquire from "proxyquire";
import * as sinon from "sinon";
import * as unzip from "unzipper";
import * as uuid from "uuid";
import { cpUtils } from "../../../src/common/deps-checker";
import { manifestUtils } from "../../../src/component/driver/teamsApp/utils/ManifestUtils";
import { Generator } from "../../../src/component/generator/generator";
import projectsJsonData from "../../../src/component/generator/officeAddin/config/projectsJsonData";
import { OfficeAddinGenerator } from "../../../src/component/generator/officeAddin/generator";
import {
  HelperMethods,
  unzipErrorHandler,
} from "../../../src/component/generator/officeAddin/helperMethods";
import { createContextV3 } from "../../../src/component/utils";
import { setTools } from "../../../src/core/globalVars";
import { ProjectTypeOptions, QuestionNames } from "../../../src/question";
import { MockTools } from "../../core/utils";
import * as fetch from "node-fetch";
import { AccessGithubError, ReadFileError, UserCancelError } from "../../../src/error";
import { Readable } from "stream";

describe("OfficeAddinGenerator for Outlook Addin", function () {
  const testFolder = path.resolve("./tmp");
  let context: Context;
  let mockedEnvRestore: RestoreFn;
  const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");

  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "true" }, { clear: true });
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

  it("should run childProcessExec command success", async function () {
    sinon.stub(childProcess, "exec").yields(`echo 'test'`, "test");
    chai.assert(await OfficeAddinGenerator.childProcessExec(`echo 'test'`), "test");
  });

  it("should throw error once command fail", async function () {
    try {
      await OfficeAddinGenerator.childProcessExec("exit -1");
    } catch (err) {
      chai.assert(err.message, "Command failed: exit -1");
    }
  });

  it("should call both doScaffolding and template generator", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "outlook-addin-test",
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

  it("should return error if doScaffolding() returns error", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "outlook-addin-test",
    };
    sinon.stub(OfficeAddinGenerator, "doScaffolding").resolves(err(mockedError));
    sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(result.isErr() && result.error.name === "mockedError");
  });

  it("should call both doScaffolding and template generator", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "outlook-addin-test",
    };
    sinon.stub(OfficeAddinGenerator, "doScaffolding").resolves(ok(undefined));
    sinon.stub(Generator, "generateTemplate").resolves(err(mockedError));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(result.isErr() && result.error.name === "mockedError");
  });

  it("should scaffold taskpane successfully on happy path", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "outlook-addin-test",
    };
    inputs["capabilities"] = ["taskpane"];
    inputs[QuestionNames.OfficeAddinFolder] = undefined;
    inputs[QuestionNames.ProgrammingLanguage] = "TypeScript";

    sinon.stub(OfficeAddinGenerator, "childProcessExec").resolves();
    sinon.stub(HelperMethods, "downloadProjectTemplateZipFile").resolves(undefined);
    sinon.stub(OfficeAddinManifest, "modifyManifestFile").resolves({});
    const result = await OfficeAddinGenerator.doScaffolding(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
  });

  it("should scaffold taskpane failed, throw error", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "outlook-addin-test",
    };
    inputs["capabilities"] = ["taskpane"];
    inputs[QuestionNames.OfficeAddinFolder] = undefined;
    inputs[QuestionNames.ProgrammingLanguage] = "TypeScript";

    sinon.stub(OfficeAddinGenerator, "childProcessExec").resolves();
    sinon.stub(HelperMethods, "downloadProjectTemplateZipFile").rejects(new UserCancelError());
    sinon.stub(OfficeAddinManifest, "modifyManifestFile").resolves({});
    const result = await OfficeAddinGenerator.doScaffolding(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
  });

  it("should copy addin files and updateManifest if addin folder is specified with json manifest", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "outlook-addin-test",
    };
    inputs["capabilities"] = ["taskpane"];
    inputs[QuestionNames.OfficeAddinFolder] = "somepath";
    inputs[QuestionNames.ProgrammingLanguage] = "TypeScript";
    inputs[QuestionNames.OfficeAddinManifest] = "manifest.json";

    const copyAddinFilesStub = sinon
      .stub(HelperMethods, "copyAddinFiles")
      .callsFake((from: string, to: string) => {
        return;
      });
    const updateManifestStub = sinon
      .stub(HelperMethods, "updateManifest")
      .callsFake(async (destination: string, manifestPath: string) => {
        return;
      });

    sinon.stub<any, any>(ManifestUtil, "loadFromPath").resolves({
      extensions: [
        {
          requirements: {
            scopes: ["mail"],
          },
        },
      ],
    });

    const result = await OfficeAddinGenerator.doScaffolding(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
    chai.expect(copyAddinFilesStub.calledOnce).to.be.true;
    chai.expect(updateManifestStub.calledOnce).to.be.true;
    chai.expect(inputs[QuestionNames.OfficeAddinHost]).to.eq("Outlook");
  });

  it("should copy addin files and convert manifest if addin folder is specified with xml manifest", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "outlook-addin-test",
    };
    inputs["capabilities"] = ["taskpane"];
    inputs[QuestionNames.OfficeAddinFolder] = "somepath";
    inputs[QuestionNames.ProgrammingLanguage] = "TypeScript";
    inputs[QuestionNames.OfficeAddinManifest] = "manifest.xml";

    let progressBarStartCalled = 0;
    let progressBarNextCalled = 0;
    let progessBarEndCalled = 0;
    const createProgressBarStub = sinon.stub(context.userInteraction, "createProgressBar").returns({
      start: async () => {
        progressBarStartCalled++;
      },
      next: async () => {
        progressBarNextCalled++;
      },
      end: async () => {
        progessBarEndCalled++;
      },
    });

    const copyAddinFilesStub = sinon
      .stub(HelperMethods, "copyAddinFiles")
      .callsFake((from: string, to: string) => {
        return;
      });
    const updateManifestStub = sinon
      .stub(HelperMethods, "updateManifest")
      .callsFake(async (destination: string, manifestPath: string) => {
        return;
      });
    const convertProjectStub = sinon
      .stub()
      .callsFake(async (manifestPath?: string, backupPath?: string) => {
        return;
      });

    const generator = proxyquire("../../../src/component/generator/officeAddin/generator", {
      "office-addin-project": {
        convertProject: convertProjectStub,
      },
    });

    sinon.stub<any, any>(ManifestUtil, "loadFromPath").resolves({
      extensions: [
        {
          requirements: {
            scopes: ["mail"],
          },
        },
      ],
    });

    const result = await generator.OfficeAddinGenerator.doScaffolding(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
    chai.expect(copyAddinFilesStub.calledOnce).to.be.true;
    chai.expect(updateManifestStub.calledOnce).to.be.true;
    chai.expect(convertProjectStub.calledOnce).to.be.true;
    chai.expect(inputs[QuestionNames.OfficeAddinHost]).to.eq("Outlook");
    chai.expect(progressBarStartCalled).to.eq(1);
    chai.expect(progressBarNextCalled).to.eq(3);
    chai.expect(progessBarEndCalled).to.eq(1);
  });

  afterEach(async () => {
    sinon.restore();
    mockedEnvRestore();
    if (await fse.pathExists(testFolder)) {
      await fse.rm(testFolder, { recursive: true });
    }
  });

  it(`should generate common template if language is "No Options"`, async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "outlook-addin-test",
      "programming-language": "No Options",
    };
    sinon.stub(OfficeAddinGenerator, "doScaffolding").resolves(ok(undefined));
    const stub = sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(
      // The forth parameter is the language parameter, which should be undefined so that
      // common template will be scaffolded.
      result.isOk() && stub.calledWith(context, testFolder, "office-addin", undefined)
    );
  });

  it(`should generate ts template if language is "TypeScript"`, async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "outlook-addin-test",
      "programming-language": "TypeScript",
    };
    sinon.stub(OfficeAddinGenerator, "doScaffolding").resolves(ok(undefined));
    const stub = sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(result.isOk() && stub.calledWith(context, testFolder, "office-addin", "ts"));
  });

  it(`should generate js template if language is "JavaScript"`, async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "app-name": "outlook-addin-test",
      "programming-language": "JavaScript",
    };
    sinon.stub(OfficeAddinGenerator, "doScaffolding").resolves(ok(undefined));
    const stub = sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(result.isOk() && stub.calledWith(context, testFolder, "office-addin", "js"));
  });
});

describe("helperMethods", async () => {
  describe("updateManifest", () => {
    const sandbox = sinon.createSandbox();
    const manifestPath = "manifestPath";
    const manifestTemplatePath = "manifestTemplatePath";
    let writePathResult: devPreview.DevPreviewSchema | undefined = undefined;

    beforeEach(() => {
      sandbox.stub(ManifestUtil, "loadFromPath").callsFake(async (path) => {
        if (path === manifestPath) {
          return {
            extensions: [],
            authorization: {
              permissions: {
                resourceSpecific: [],
              },
            },
          } as unknown as devPreview.DevPreviewSchema;
        } else if (path === manifestTemplatePath) {
          return {
            extensions: undefined,
            authorization: undefined,
          } as unknown as devPreview.DevPreviewSchema;
        }

        throw new Error("Invalid path");
      });

      sandbox.stub(ManifestUtil, "writeToPath").callsFake(async (path, manifest) => {
        writePathResult = manifest as devPreview.DevPreviewSchema;
        return;
      });

      sandbox.stub(manifestUtils, "getTeamsAppManifestPath").returns(manifestTemplatePath);
    });

    afterEach(() => {
      sandbox.restore();
      writePathResult = undefined;
    });

    it("should update manifest's extenstions and authorization", async () => {
      sandbox.stub(fse, "pathExists").resolves(true);
      await HelperMethods.updateManifest("", manifestPath);

      chai.assert.isDefined(writePathResult);
      chai.assert.equal(writePathResult?.extensions?.length, 0);
      chai.assert.equal(writePathResult?.authorization?.permissions?.resourceSpecific?.length, 0);
    });

    it("should early return if there's no appPackage folder", async () => {
      sandbox.stub(fse, "pathExists").resolves(false);
      await HelperMethods.updateManifest("", manifestPath);

      chai.assert.isUndefined(writePathResult, "writeToPath should not be called");
    });
  });

  describe("downloadProjectTemplateZipFile", async () => {
    const sandbox = sinon.createSandbox();
    class ResponseData extends EventEmitter {
      pipe(ws: fs.WriteStream) {
        return this;
      }
    }

    class MockedWriteStream {
      on(event: string, cb: () => void) {
        return this;
      }
    }

    afterEach(() => {
      sandbox.restore();
    });
    it("should fetch fail", async () => {
      const resp = new ResponseData();
      sandbox.stub(fetch, "default").rejects(new Error());
      const mockedStream = new MockedWriteStream();
      const unzipStub = sandbox.stub(HelperMethods, "unzipProjectTemplate").resolves();
      sandbox.stub<any, any>(fs, "createWriteStream").returns(mockedStream);
      try {
        await HelperMethods.downloadProjectTemplateZipFile("", "");
        chai.assert.fail("should not reach here");
      } catch (e) {
        chai.assert.isTrue(e instanceof AccessGithubError);
      }
    });
    it("should download project template zip file", async () => {
      const resp = new ResponseData();
      sandbox.stub(fetch, "default").resolves({ body: resp } as any);
      const mockedStream = new MockedWriteStream();
      const unzipStub = sandbox.stub(HelperMethods, "unzipProjectTemplate").resolves();
      sandbox.stub<any, any>(fs, "createWriteStream").returns(mockedStream);
      const promise = HelperMethods.downloadProjectTemplateZipFile("", "");
      // manully wait for the close event to be registered
      await new Promise((resolve) => setTimeout(resolve, 100));
      resp.emit("close");
      await promise;
      chai.assert.isTrue(unzipStub.calledOnce);
    });

    it("unzipProjectTemplate error", async () => {
      const resp = new ResponseData();
      sandbox.stub(fetch, "default").resolves({ body: resp } as any);
      const mockedStream = new MockedWriteStream();
      sandbox.stub(HelperMethods, "unzipProjectTemplate").rejects(new Error());
      sandbox.stub<any, any>(fs, "createWriteStream").returns(mockedStream);
      const promise = HelperMethods.downloadProjectTemplateZipFile("", "");
      // manully wait for the close event to be registered
      await new Promise((resolve) => setTimeout(resolve, 100));
      resp.emit("close");
      try {
        await promise;
        chai.assert.fail("should throw error");
      } catch (e) {}
    });

    it("download error", async () => {
      const resp = new ResponseData();
      sandbox.stub(fetch, "default").resolves({ body: resp } as any);
      const mockedStream = new MockedWriteStream();
      const unzipStub = sandbox.stub(HelperMethods, "unzipProjectTemplate").resolves();
      sandbox.stub<any, any>(fs, "createWriteStream").returns(mockedStream);
      const promise = HelperMethods.downloadProjectTemplateZipFile("", "");
      // manully wait for the close event to be registered
      await new Promise((resolve) => setTimeout(resolve, 100));
      resp.emit("error", new Error());
      try {
        await promise;
        chai.assert.fail("should throw error");
      } catch (e) {}
      chai.assert.isTrue(unzipStub.notCalled);
    });

    it("Response body is null.", async () => {
      sandbox.stub(fetch, "default").resolves({ body: null } as any);
      const promise = HelperMethods.downloadProjectTemplateZipFile("", "");
      try {
        await promise;
        chai.assert.fail("should throw error");
      } catch (e) {
        chai.assert.isTrue(e instanceof AccessGithubError);
      }
    });
  });

  describe("unzipProjectTemplate", () => {
    const sandbox = sinon.createSandbox();

    class MockedReadStream {
      on(event: string, cb: () => void) {
        return this;
      }

      pipe(ws: fs.WriteStream) {
        return this;
      }
    }

    afterEach(() => {
      sandbox.restore();
    });

    it("work as expected", async () => {
      sandbox.stub<any, any>(fs, "createReadStream").returns(new MockedReadStream());
      sandbox.stub<any, any>(unzip, "Extract").returns({});
      try {
        HelperMethods.unzipProjectTemplate("");
      } catch (err) {
        chai.assert.fail(err);
      } finally {
        sandbox.restore();
      }
    });

    it("unzipErrorHandler", async () => {
      let i = 0;
      const reject = () => {
        i++;
      };
      unzipErrorHandler("", reject, new Error());
      chai.assert.equal(i, 1);
    });
    it("unzipErrorHandler 2", async () => {
      let i = 0;
      const reject = () => {
        i++;
      };
      unzipErrorHandler("", reject, new Error("test"));
      chai.assert.equal(i, 1);
    });
  });

  describe("moveUnzippedFiles", () => {
    const projectRoot = "/home/user/teamsapp";

    beforeEach(() => {
      mockfs({
        "/home/user/teamsapp/project.zip": "xxx",
        "/home/user/teamsapp/project": {
          file1: "xxx",
          file2: "yyy",
        },
      });
    });

    afterEach(() => {
      mockfs.restore();
    });

    it("should remove zip file and unzipped folder and copy files", async () => {
      try {
        HelperMethods.moveUnzippedFiles(projectRoot);
        chai.assert.equal(fs.existsSync("/home/user/teamsapp/project.zip"), false);
        chai.assert.equal(fs.existsSync("/home/user/teamsapp/project"), false);
        chai.assert.equal(fs.existsSync("/home/user/teamsapp/file1"), true);
        chai.assert.equal(fs.existsSync("/home/user/teamsapp/file2"), true);
      } catch (err) {
        chai.assert.fail(err);
      }
    });
  });

  describe("copyAddinFiles", () => {
    const projectRoot = "/home/user/teamsapp";

    beforeEach(() => {
      mockfs({
        "/home/user/teamsapp/.gitignore": "xxx",
        "/home/user/teamsapp/project": {
          file1: "xxx",
          file2: "yyy",
        },
        "/home/user/teamsapp/node_modules": {
          file3: "xxx",
        },
      });
    });

    afterEach(() => {
      mockfs.restore();
    });

    it("should copy project files and .gitignore but ignore node_modules", async () => {
      try {
        const destination = "/home/user/destination";
        HelperMethods.copyAddinFiles(projectRoot, destination);
        chai.assert.equal(fs.existsSync(path.join(destination, "project", "file1")), true);
        chai.assert.equal(fs.existsSync(path.join(destination, "project", "file2")), true);
        chai.assert.equal(fs.existsSync(path.join(destination, ".gitignore")), true);
        chai.assert.equal(fs.existsSync(path.join(destination, "node_modules")), false);
      } catch (err) {
        chai.assert.fail(err);
      }
    });
  });

  describe("moveManifestLocation", () => {
    const projectRoot = "/home/user/addin";

    beforeEach(() => {
      mockfs({
        "/home/user/addin/manifest.json": "{}",
        "/home/user/addin/assets": {
          file1: "xxx",
        },
        "/home/user/addin/webpack.config.js": JSON.stringify([
          {
            from: "assets/*",
            to: "assets/[name][ext][query]",
          },
          {
            from: "manifest*.json",
            to: "[name]" + "[ext]",
          },
        ]),
        "/home/user/addin/package.json": JSON.stringify({
          scripts: {
            start: "office-addin-debugging start manifest.json",
            stop: "office-addin-debugging stop manifest.json",
            validate: "office-addin-manifest validate manifest.json",
          },
        }),
        "/home/user/addin/src/taskpane/taskpane.html": `<img width="90" height="90" src="../../assets/logo-filled.png" alt="Contoso" title="Contoso" />`,
      });
    });

    afterEach(() => {
      mockfs.restore();
    });

    it("should move manifest.json into appPackage folder", async () => {
      await HelperMethods.moveManifestLocation(projectRoot, "manifest.json");
      chai.assert.isFalse(await fse.pathExists(path.join(projectRoot, "manifest.json")));
      chai.assert.isFalse(await fse.pathExists(path.join(projectRoot, "assets")));

      chai.assert.isTrue(
        await fse.pathExists(path.join(projectRoot, "appPackage", "manifest.json"))
      );
      chai.assert.isTrue(
        await fse.pathExists(path.join(projectRoot, "appPackage", "assets", "file1"))
      );

      const webpackConfigPath = path.join(projectRoot, "webpack.config.js");
      const webpackConfigJson = JSON.parse(await fse.readFile(webpackConfigPath, "utf8"));
      chai.assert.equal(webpackConfigJson[0].from, "appPackage/assets/*");
      chai.assert.equal(webpackConfigJson[1].from, "appPackage/manifest*.json");

      const packageJsonPath = path.join(projectRoot, "package.json");
      const packageJson = JSON.parse(await fse.readFile(packageJsonPath, "utf8"));
      chai.assert.equal(
        packageJson.scripts.start,
        "office-addin-debugging start appPackage/manifest.json"
      );

      chai.assert.equal(
        packageJson.scripts.stop,
        "office-addin-debugging stop appPackage/manifest.json"
      );
      chai.assert.equal(
        packageJson.scripts.validate,
        "office-addin-manifest validate appPackage/manifest.json"
      );

      const htmlPath = path.join(projectRoot, "src", "taskpane", "taskpane.html");
      const html = await fse.readFile(htmlPath, "utf8");
      chai.assert.equal(
        html,
        `<img width="90" height="90" src="../../appPackage/assets/logo-filled.png" alt="Contoso" title="Contoso" />`
      );
    });
  });
});

describe("projectsJsonData for Outlook Addin", () => {
  it("should contain desired values", () => {
    const data = new projectsJsonData();
    chai.assert.equal(data.getHostDisplayName("outlook"), "Outlook");
    chai.assert.isUndefined(data.getHostDisplayName("xxx"));
    chai.assert.deepEqual(data.getHostTemplateNames("taskpane"), [
      "Outlook",
      "Word",
      "Excel",
      "PowerPoint",
    ]);
    chai.assert.isEmpty(data.getHostTemplateNames("xxx"));
    chai.assert.deepEqual(data.getSupportedScriptTypes("taskpane"), ["TypeScript"]);
    chai.assert.equal(
      data.getProjectTemplateRepository("taskpane", "typescript"),
      "https://github.com/OfficeDev/Office-Addin-TaskPane"
    );
    chai.assert.equal(
      data.getProjectTemplateBranchName("taskpane", "typescript", false),
      "json-preview-yo-office"
    );

    chai.assert.deepEqual(
      data.getProjectDownloadLink("taskpane", "TypeScript"),
      "https://aka.ms/teams-toolkit/office-addin-taskpane"
    );

    chai.assert.isDefined(data.getParsedProjectJsonData());
    chai.assert.isFalse(data.projectBothScriptTypes("taskpane"));
  });
});

describe("projectsJsonData for Office Addin", () => {
  it("should contain desired values", () => {
    const data = new projectsJsonData();
    chai.assert.equal(data.getHostDisplayName("outlook"), "Outlook");
    chai.assert.isUndefined(data.getHostDisplayName("xxx"));
    chai.assert.deepEqual(data.getHostTemplateNames("taskpane"), [
      "Outlook",
      "Word",
      "Excel",
      "PowerPoint",
    ]);
    chai.assert.isEmpty(data.getHostTemplateNames("xxx"));
    chai.assert.deepEqual(data.getSupportedScriptTypesNew("taskpane"), [
      "TypeScript",
      "JavaScript",
    ]);
    chai.assert.equal(
      data.getProjectTemplateRepositoryNew("taskpane", "typescript", "default"),
      "https://github.com/OfficeDev/Office-Addin-TaskPane"
    );
    chai.assert.isUndefined(data.getProjectTemplateRepositoryNew("xxx", "typescript", "default"));
    chai.assert.equal(
      data.getProjectTemplateBranchNameNew("taskpane", "typescript", "default", false),
      "json-wxpo-preview"
    );
    chai.assert.isUndefined(
      data.getProjectTemplateBranchNameNew("xxx", "typescript", "default", false)
    );
    chai.assert.equal(
      data.getProjectTemplateBranchNameNew("taskpane", "typescript", "default", true),
      "json-wxpo-preview"
    );
    chai.assert.deepEqual(
      data.getProjectRepoAndBranchNew("taskpane", "typescript", "default", false),
      {
        repo: "https://github.com/OfficeDev/Office-Addin-TaskPane",
        branch: "json-wxpo-preview",
      }
    );
    chai.assert.deepEqual(data.getProjectRepoAndBranchNew("xxx", "typescript", "default", false), {
      repo: undefined,
      branch: undefined,
    });

    chai.assert.deepEqual(
      data.getProjectDownloadLinkNew("taskpane", "TypeScript", "default"),
      "https://aka.ms/teams-toolkit/office-addin-taskpane/ts-default"
    );

    chai.assert.isDefined(data.getParsedProjectJsonData());
    chai.assert.isTrue(data.projectBothScriptTypesNew("taskpane"));
  });
});

describe("OfficeAddinGenerator for Office Addin", function () {
  const testFolder = path.resolve("./tmp");
  let context: Context;
  let mockedEnvRestore: RestoreFn;
  const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");

  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "true" }, { clear: true });
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

  it("should run childProcessExec command success", async function () {
    sinon.stub(childProcess, "exec").yields(`echo 'test'`, "test");
    chai.assert(await OfficeAddinGenerator.childProcessExec(`echo 'test'`), "test");
  });

  it("should throw error once command fail", async function () {
    try {
      await OfficeAddinGenerator.childProcessExec("exit -1");
    } catch (err) {
      chai.assert(err.message, "Command failed: exit -1");
    }
  });

  it("should call both doScaffolding and template generator", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "project-type": ProjectTypeOptions.officeAddin().id,
      "app-name": "office-addin-test",
      "office-addin-framework-type": "default",
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

  it("should return error if doScaffolding() returns error", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "project-type": ProjectTypeOptions.officeAddin().id,
      "app-name": "office-addin-test",
      "office-addin-framework-type": "default",
    };
    sinon.stub(OfficeAddinGenerator, "doScaffolding").resolves(err(mockedError));
    sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(result.isErr() && result.error.name === "mockedError");
  });

  it("should call both doScaffolding and template generator", async function () {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "project-type": ProjectTypeOptions.officeAddin().id,
      "app-name": "office-addin-test",
      "office-addin-framework-type": "default",
    };
    sinon.stub(OfficeAddinGenerator, "doScaffolding").resolves(ok(undefined));
    sinon.stub(Generator, "generateTemplate").resolves(err(mockedError));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(result.isErr() && result.error.name === "mockedError");
  });

  it("should scaffold taskpane successfully on happy path", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "project-type": ProjectTypeOptions.officeAddin().id,
      "app-name": "office-addin-test",
      "office-addin-framework-type": "default",
    };
    inputs["capabilities"] = ["taskpane"];
    inputs[QuestionNames.OfficeAddinFolder] = undefined;
    inputs[QuestionNames.ProgrammingLanguage] = "typescript";

    sinon.stub(OfficeAddinGenerator, "childProcessExec").resolves();
    sinon.stub(HelperMethods, "downloadProjectTemplateZipFile").resolves(undefined);
    sinon.stub(OfficeAddinManifest, "modifyManifestFile").resolves({});
    const result = await OfficeAddinGenerator.doScaffolding(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
  });

  it("should scaffold taskpane failed, throw error", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "project-type": ProjectTypeOptions.officeAddin().id,
      "app-name": "office-addin-test",
      "office-addin-framework-type": "default",
    };
    inputs["capabilities"] = ["taskpane"];
    inputs[QuestionNames.OfficeAddinFolder] = undefined;
    inputs[QuestionNames.ProgrammingLanguage] = "TypeScript";

    sinon.stub(OfficeAddinGenerator, "childProcessExec").resolves();
    sinon.stub(HelperMethods, "downloadProjectTemplateZipFile").rejects(new UserCancelError());
    sinon.stub(OfficeAddinManifest, "modifyManifestFile").resolves({});
    const result = await OfficeAddinGenerator.doScaffolding(context, inputs, testFolder);

    chai.expect(result.isErr()).to.eq(true);
  });

  it("should copy addin files and updateManifest if addin folder is specified with json manifest", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "project-type": ProjectTypeOptions.officeAddin().id,
      "app-name": "office-addin-test",
      "office-addin-framework-type": "default",
    };
    inputs["capabilities"] = ["taskpane"];
    inputs[QuestionNames.OfficeAddinFolder] = "somepath";
    inputs[QuestionNames.ProgrammingLanguage] = "TypeScript";
    inputs[QuestionNames.OfficeAddinManifest] = "manifest.json";

    const copyAddinFilesStub = sinon
      .stub(HelperMethods, "copyAddinFiles")
      .callsFake((from: string, to: string) => {
        return;
      });
    const updateManifestStub = sinon
      .stub(HelperMethods, "updateManifest")
      .callsFake(async (destination: string, manifestPath: string) => {
        return;
      });

    sinon.stub<any, any>(ManifestUtil, "loadFromPath").resolves({
      extensions: [
        {
          requirements: {
            scopes: ["mail"],
          },
        },
      ],
    });

    const result = await OfficeAddinGenerator.doScaffolding(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
    chai.expect(copyAddinFilesStub.calledOnce).to.be.true;
    chai.expect(updateManifestStub.calledOnce).to.be.true;
    chai.expect(inputs[QuestionNames.OfficeAddinHost]).to.eq("Outlook");
  });

  it("should copy addin files and convert manifest if addin folder is specified with xml manifest", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "project-type": ProjectTypeOptions.officeAddin().id,
      "app-name": "office-addin-test",
      "office-addin-framework-type": "default",
    };
    inputs["capabilities"] = ["taskpane"];
    inputs[QuestionNames.OfficeAddinFolder] = "somepath";
    inputs[QuestionNames.ProgrammingLanguage] = "TypeScript";
    inputs[QuestionNames.OfficeAddinManifest] = "manifest.xml";

    let progressBarStartCalled = 0;
    let progressBarNextCalled = 0;
    let progessBarEndCalled = 0;
    const createProgressBarStub = sinon.stub(context.userInteraction, "createProgressBar").returns({
      start: async () => {
        progressBarStartCalled++;
      },
      next: async () => {
        progressBarNextCalled++;
      },
      end: async () => {
        progessBarEndCalled++;
      },
    });

    const copyAddinFilesStub = sinon
      .stub(HelperMethods, "copyAddinFiles")
      .callsFake((from: string, to: string) => {
        return;
      });
    const updateManifestStub = sinon
      .stub(HelperMethods, "updateManifest")
      .callsFake(async (destination: string, manifestPath: string) => {
        return;
      });
    const convertProjectStub = sinon
      .stub()
      .callsFake(async (manifestPath?: string, backupPath?: string) => {
        return;
      });

    const generator = proxyquire("../../../src/component/generator/officeAddin/generator", {
      "office-addin-project": {
        convertProject: convertProjectStub,
      },
    });

    sinon.stub<any, any>(ManifestUtil, "loadFromPath").resolves({
      extensions: [
        {
          requirements: {
            scopes: ["mail"],
          },
        },
      ],
    });

    const result = await generator.OfficeAddinGenerator.doScaffolding(context, inputs, testFolder);

    chai.expect(result.isOk()).to.eq(true);
    chai.expect(copyAddinFilesStub.calledOnce).to.be.true;
    chai.expect(updateManifestStub.calledOnce).to.be.true;
    chai.expect(convertProjectStub.calledOnce).to.be.true;
    chai.expect(inputs[QuestionNames.OfficeAddinHost]).to.eq("Outlook");
    chai.expect(progressBarStartCalled).to.eq(1);
    chai.expect(progressBarNextCalled).to.eq(3);
    chai.expect(progessBarEndCalled).to.eq(1);
  });

  afterEach(async () => {
    sinon.restore();
    mockedEnvRestore();
    if (await fse.pathExists(testFolder)) {
      await fse.rm(testFolder, { recursive: true });
    }
  });

  it(`should generate common template if language is "No Options"`, async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "project-type": ProjectTypeOptions.officeAddin().id,
      "app-name": "office-addin-test",
      "programming-language": "No Options",
      "office-addin-framework-type": "default",
    };
    sinon.stub(OfficeAddinGenerator, "doScaffolding").resolves(ok(undefined));
    const stub = sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(
      // The forth parameter is the language parameter, which should be undefined so that
      // common template will be scaffolded.
      result.isOk() && stub.calledWith(context, testFolder, "office-json-addin", undefined)
    );
  });

  it(`should generate ts template if language is "TypeScript"`, async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "project-type": ProjectTypeOptions.officeAddin().id,
      "app-name": "office-addin-test",
      "programming-language": "TypeScript",
      "office-addin-framework-type": "default",
    };
    sinon.stub(OfficeAddinGenerator, "doScaffolding").resolves(ok(undefined));
    const stub = sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(
      result.isOk() && stub.calledWith(context, testFolder, "office-json-addin", "ts")
    );
  });

  it(`should generate js template if language is "JavaScript"`, async () => {
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: testFolder,
      "project-type": ProjectTypeOptions.officeAddin().id,
      "app-name": "office-addin-test",
      "programming-language": "JavaScript",
      "office-addin-framework-type": "default",
    };
    sinon.stub(OfficeAddinGenerator, "doScaffolding").resolves(ok(undefined));
    const stub = sinon.stub(Generator, "generateTemplate").resolves(ok(undefined));

    const result = await OfficeAddinGenerator.generate(context, inputs, testFolder);

    chai.assert.isTrue(
      result.isOk() && stub.calledWith(context, testFolder, "office-json-addin", "js")
    );
  });
});

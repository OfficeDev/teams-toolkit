import * as chai from "chai";
import * as chaiPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as tmp from "tmp";
import * as fs from "fs-extra";
import * as path from "path";
import * as crypto from "crypto";
import * as telemetry from "../../../../src/chat/telemetry";
import * as util from "../../../../src/chat/utils";
import * as officeChatUtils from "../../../../src/officeChat/utils";
import * as officeChathelper from "../../../../src/officeChat/commands/create/helper";
import * as chatHelper from "../../../../src/chat/commands/create/helper";
import * as generatorUtils from "@microsoft/teamsfx-core/build/component/generator/utils";
import axios from "axios";
import { ExtTelemetry } from "../../../../src/telemetry/extTelemetry";
import { CancellationToken } from "../../../mocks/vsc";
import { officeSampleProvider } from "../../../../src/officeChat/commands/create/officeSamples";
import { ProjectMetadata } from "../../../../src/chat/commands/create/types";

chai.use(chaiPromised);

describe("File: office chat create helper", () => {
  const sandbox = sinon.createSandbox();

  describe("Method: matchOfficeProject", () => {
    let officeChatTelemetryDataMock: any;
    beforeEach(() => {
      officeChatTelemetryDataMock = sandbox.createStubInstance(telemetry.ChatTelemetryData);
      sandbox.stub(officeChatTelemetryDataMock, "properties").get(function getterFn() {
        return undefined;
      });
      sandbox.stub(officeChatTelemetryDataMock, "measurements").get(function getterFn() {
        return undefined;
      });
      sandbox.stub(officeSampleProvider, "OfficeSampleCollection").get(function getterFn() {
        return {
          samples: [
            {
              id: "test",
              title: "test",
              fullDescription: "test",
            },
          ],
        };
      });
      officeChatTelemetryDataMock.chatMessages = [];
      sandbox
        .stub(telemetry.ChatTelemetryData, "createByParticipant")
        .returns(officeChatTelemetryDataMock);
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("has matched office sample project", async () => {
      sandbox.stub(util, "getCopilotResponseAsString").resolves('{ "addin": "test" }');
      const token = new CancellationToken();
      const result = await officeChathelper.matchOfficeProject(
        { prompt: "test" } as vscode.ChatRequest,
        token,
        officeChatTelemetryDataMock
      );
      chai.expect(result).to.exist;
      chai.assert.strictEqual(result!.id, "test");
    });

    it("response is empty", async () => {
      sandbox.stub(util, "getCopilotResponseAsString").resolves("");
      const token = new CancellationToken();
      const result = await officeChathelper.matchOfficeProject(
        { prompt: "test" } as vscode.ChatRequest,
        token,
        officeChatTelemetryDataMock
      );
      chai.expect(result).to.undefined;
    });

    it("response JSON cannot be parsed", async () => {
      sandbox.stub(util, "getCopilotResponseAsString").resolves("{}");
      const token = new CancellationToken();
      const result = await officeChathelper.matchOfficeProject(
        { prompt: "test" } as vscode.ChatRequest,
        token,
        officeChatTelemetryDataMock
      );
      chai.expect(result).to.undefined;
    });
  });

  describe("Method: showOfficeSampleFileTree", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("call filetree API", async () => {
      sandbox.stub(officeChatUtils, "getOfficeSampleDownloadUrlInfo").resolves({
        owner: "test",
        repository: "testRepo",
        ref: "testRef",
        dir: "testDir",
      });
      sandbox.stub(generatorUtils, "getSampleFileInfo").resolves({
        samplePaths: ["test"],
        fileUrlPrefix: "https://test.com/",
      });
      sandbox.stub(tmp, "dirSync").returns({
        name: "tempDir",
      } as unknown as tmp.DirResult);
      sandbox.stub(axios, "get").callsFake(async (url: string, config) => {
        if (url === "https://test.com/test") {
          return { data: "testData", status: 200 };
        } else {
          throw new Error("Invalid URL");
        }
      });
      sandbox.stub(fs, "ensureFile");
      sandbox.stub(fs, "writeFile");

      const projectMetadata = {
        id: "test",
        type: "sample",
        platform: "WXP",
        name: "test",
        description: "test",
      } as ProjectMetadata;
      const response = {
        markdown: sandbox.stub(),
        filetree: sandbox.stub(),
      };
      const result = await officeChathelper.showOfficeSampleFileTree(
        projectMetadata,
        response as unknown as vscode.ChatResponseStream
      );
      chai.assert.isTrue(response.filetree.calledOnce);
      chai.assert.strictEqual(result, path.join("tempDir", "testDir"));
    });
  });

  describe("Method: showOfficeTemplateFileTree", () => {
    beforeEach(() => {
      sandbox.stub(tmp, "dirSync").returns({
        name: "tempDir",
      } as unknown as tmp.DirResult);
      const mockBuffer = Buffer.from("0");
      sandbox.stub(crypto, "randomBytes").returns(mockBuffer as unknown as void);
      sandbox.stub(fs, "ensureDir").resolves();
      sandbox.stub(fs, "readFile").resolves(Buffer.from(""));
      sandbox.stub(fs, "writeFile").resolves();
      sandbox.stub(vscode.commands, "executeCommand");
      sandbox.stub(fs, "readdirSync").returns([]);
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("call filetree API with taskpane project", async () => {
      const data = {
        capabilities: "test",
        "project-type": "test",
        "addin-host": "test",
        agent: "test",
        "programming-language": "test",
      };
      const codeSnippet = "test";
      const response = {
        markdown: sandbox.stub(),
        filetree: sandbox.stub(),
      };
      const result = await officeChathelper.showOfficeTemplateFileTree(
        data,
        response as unknown as vscode.ChatResponseStream,
        codeSnippet
      );
      chai.assert.isTrue(response.filetree.calledOnce);
      chai.assert.strictEqual(result, path.join("tempDir", "office-addin-30"));
    });

    it("call filetree API with cf project", async () => {
      const data = {
        capabilities: "excel-cftest",
        "project-type": "test",
        "addin-host": "test",
        agent: "test",
        "programming-language": "test",
      };
      const codeSnippet = "test";
      const response = {
        markdown: sandbox.stub(),
        filetree: sandbox.stub(),
      };
      const result = await officeChathelper.showOfficeTemplateFileTree(
        data,
        response as unknown as vscode.ChatResponseStream,
        codeSnippet
      );
      chai.assert.isTrue(response.filetree.calledOnce);
      chai.assert.strictEqual(result, path.join("tempDir", "office-addin-30"));
    });

    it("code snippet is null", async () => {
      const data = {
        capabilities: "test",
        "project-type": "test",
        "addin-host": "test",
        agent: "test",
        "programming-language": "test",
      };
      const codeSnippet = "";
      const response = {
        markdown: sandbox.stub(),
        filetree: sandbox.stub(),
      };
      const mergeCFCodeStub = sandbox.stub(officeChathelper, "mergeCFCode");
      const mergeTaskpaneCodeStub = sandbox.stub(officeChathelper, "mergeTaskpaneCode");
      await officeChathelper.showOfficeTemplateFileTree(
        data,
        response as unknown as vscode.ChatResponseStream,
        codeSnippet
      );
      chai.assert.isTrue(mergeCFCodeStub.notCalled);
      chai.assert.isTrue(mergeTaskpaneCodeStub.notCalled);
    });
  });

  describe("Method: buildTemplateFileTree", () => {
    let tempFolder: string;
    let tempAppName: string;
    beforeEach(() => {
      sandbox.stub(fs, "ensureDir").resolves();
      sandbox.stub(fs, "writeFile").resolves();
      tempFolder = "testFolder";
      tempAppName = "testAppName";
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("traverse the folder", async () => {
      sandbox.stub(fs, "readFile").resolves(Buffer.from(""));
      const data = {
        capabilities: "test",
        "project-type": "test",
        "addin-host": "test",
        agent: "test",
        "programming-language": "test",
      };
      const codeSnippet = "test";
      const files = ["file1", "subdir"];
      const subdirFiles = ["file2"];
      const dirStat = {
        isDirectory: () => true,
      } as fs.Stats;

      const nonDirStats = {
        isDirectory: () => false,
      } as fs.Stats;
      sandbox
        .stub(fs, "readdirSync")
        .onFirstCall()
        .returns(files as any)
        .onSecondCall()
        .returns(subdirFiles as any);
      const fileTreeAddStub = sandbox.stub(chatHelper, "fileTreeAdd");
      const lstatSyncStub = sandbox.stub(fs, "lstatSync");
      lstatSyncStub.withArgs(path.join(tempFolder, tempAppName, "file1")).returns(nonDirStats);
      lstatSyncStub.withArgs(path.join(tempFolder, tempAppName, "subdir")).returns(dirStat);
      lstatSyncStub
        .withArgs(path.join(tempFolder, tempAppName, "subdir", "file2"))
        .returns(nonDirStats);

      await officeChathelper.buildTemplateFileTree(data, tempFolder, tempAppName, codeSnippet);
      chai.assert.isTrue(fileTreeAddStub.calledTwice);
    });

    it("fail to merge taskpane code snippet", async () => {
      sandbox.stub(fs, "readFile").rejects(new Error("test"));
      const data = {
        capabilities: "test",
        "project-type": "test",
        "addin-host": "test",
        agent: "test",
        "programming-language": "test",
      };
      const codeSnippet = "test";
      try {
        await officeChathelper.buildTemplateFileTree(data, tempFolder, tempAppName, codeSnippet);
        chai.assert.fail("should not reach here");
      } catch (error) {
        chai.assert.strictEqual((error as Error).message, "Failed to merge the taskpane project.");
      }
    });

    it("fail to merge taskpane code snippet", async () => {
      sandbox.stub(fs, "readFile").rejects(new Error("test"));
      const data = {
        capabilities: "excel-cftest",
        "project-type": "test",
        "addin-host": "test",
        agent: "test",
        "programming-language": "test",
      };
      const codeSnippet = "test";
      try {
        await officeChathelper.buildTemplateFileTree(data, tempFolder, tempAppName, codeSnippet);
        chai.assert.fail("should not reach here");
      } catch (error) {
        chai.assert.strictEqual((error as Error).message, "Failed to merge the CF project.");
      }
    });
  });
});

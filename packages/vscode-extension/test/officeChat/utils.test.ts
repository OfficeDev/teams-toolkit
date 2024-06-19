import * as chai from "chai";
import * as sinon from "sinon";
import * as chaipromised from "chai-as-promised";
import * as vscode from "vscode";
import * as utils from "../../src/officeChat/utils";
import * as chatUtils from "../../src/chat/utils";
import * as dynamicPrompt from "../../src/officeChat/dynamicPrompt";
import { CancellationToken } from "../mocks/vsc";
import { officeSampleProvider } from "../../src/officeChat/commands/create/officeSamples";
import { Spec } from "../../src/officeChat/common/skills/spec";
import { OfficeChatTelemetryData } from "../../src/officeChat/telemetry";

chai.use(chaipromised);

describe("File: officeChat/utils.ts", () => {
  const sandbox = sinon.createSandbox();

  describe("Method: purifyUserMessage", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("purify user message successfully", async () => {
      const token = new CancellationToken();
      const getCopilotResponseAsStringStub = sandbox
        .stub(chatUtils, "getCopilotResponseAsString")
        .resolves("purified message");
      const officeChatTelemetryDataMock = sandbox.createStubInstance(OfficeChatTelemetryData);
      const result = await utils.purifyUserMessage("test", token, officeChatTelemetryDataMock);
      chai.assert.isTrue(getCopilotResponseAsStringStub.calledOnce);
      chai.expect(result).equal("purified message");
    });

    it("purify user message successfully", async () => {
      const token = new CancellationToken();
      const getCopilotResponseAsStringStub = sandbox
        .stub(chatUtils, "getCopilotResponseAsString")
        .resolves("");
      const officeChatTelemetryDataMock = sandbox.createStubInstance(OfficeChatTelemetryData);
      const result = await utils.purifyUserMessage("test", token, officeChatTelemetryDataMock);
      chai.assert.isTrue(getCopilotResponseAsStringStub.calledOnce);
      chai.expect(result).equal("test");
    });
  });

  describe("Method: isInputHarmful", () => {
    beforeEach(() => {
      sandbox.stub(dynamicPrompt, "buildDynamicPrompt").returns({
        messages: [],
        version: "0.0.1",
      });
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("check the input is harmful", async () => {
      sandbox.stub(chatUtils, "getCopilotResponseAsString").resolves('{"isHarmful": true}```');
      const token = new CancellationToken();
      const officeChatTelemetryDataMock = sandbox.createStubInstance(OfficeChatTelemetryData);
      const result = await utils.isInputHarmful(
        { prompt: "test" } as unknown as vscode.ChatRequest,
        token,
        officeChatTelemetryDataMock
      );
      chai.assert.isTrue(result);
    });

    it("check the input is harmless", async () => {
      sandbox.stub(chatUtils, "getCopilotResponseAsString").resolves('{"isHarmful": false}');
      const token = new CancellationToken();
      const officeChatTelemetryDataMock = sandbox.createStubInstance(OfficeChatTelemetryData);
      const result = await utils.isInputHarmful(
        { prompt: "test" } as unknown as vscode.ChatRequest,
        token,
        officeChatTelemetryDataMock
      );
      chai.assert.isFalse(result);
    });

    it("get empty response", async () => {
      sandbox.stub(chatUtils, "getCopilotResponseAsString").resolves(undefined);
      const token = new CancellationToken();
      const officeChatTelemetryDataMock = sandbox.createStubInstance(OfficeChatTelemetryData);
      try {
        await utils.isInputHarmful(
          { prompt: "test" } as unknown as vscode.ChatRequest,
          token,
          officeChatTelemetryDataMock
        );
        chai.assert.fail("Should not reach here.");
      } catch (error) {
        chai.expect((error as Error).message).equal("Got empty response");
      }
    });

    it("isHarmful is not boolean", async () => {
      sandbox.stub(chatUtils, "getCopilotResponseAsString").resolves('{"isHarmful": "test"}');
      const token = new CancellationToken();
      const officeChatTelemetryDataMock = sandbox.createStubInstance(OfficeChatTelemetryData);
      try {
        await utils.isInputHarmful(
          { prompt: "test" } as unknown as vscode.ChatRequest,
          token,
          officeChatTelemetryDataMock
        );
        chai.assert.fail("Should not reach here.");
      } catch (error) {
        chai
          .expect((error as Error).message)
          .equal("Failed to parse response: isHarmful is not a boolean.");
      }
    });
  });

  describe("Method: isOutputHarmful", () => {
    beforeEach(() => {
      sandbox.stub(dynamicPrompt, "buildDynamicPrompt").returns({
        messages: [],
        version: "0.0.1",
      });
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("output is harmful", async () => {
      sandbox.stub(chatUtils, "getCopilotResponseAsString").resolves("");
      const token = new CancellationToken();
      const spec = new Spec("Some user input");
      const result = await utils.isOutputHarmful("test", token, spec);
      chai.assert.isTrue(result);
    });

    it("output is harmless", async () => {
      sandbox.stub(chatUtils, "getCopilotResponseAsString").resolves("0");
      const token = new CancellationToken();
      const spec = new Spec("Some user input");
      const result = await utils.isOutputHarmful("test", token, spec);
      chai.assert.isFalse(result);
    });
  });

  describe("Method: getOfficeSampleDownloadUrlInfo", () => {
    const fakedOfficeSampleConfig = {
      filterOptions: {
        capabilities: ["Excel"],
        languages: ["TS"],
        technologies: ["Office Add-in"],
      },
      samples: [
        {
          id: "Excel-Add-in-ShapeAPI-Dashboard",
          title: "Using shape API to work as a dashboard",
          shortDescription: "Using Shape related APIs to insert and format to work as a dashboard.",
          fullDescription:
            "The sample add-in demonstrates Excel add-in capablities to help users using shape API to work as a dashboard.",
          tags: ["TS", "Shape", "Excel", "Office Add-in"],
          time: "5min to run",
          configuration: "Ready for debug",
          thumbnailPath: "",
          suggested: false,
          downloadUrlInfo: {
            owner: "OfficeDev",
            repository: "Office-Samples",
            ref: "dev",
            dir: "Excel-Add-in-ShapeAPI-Dashboard",
          },
        },
      ],
    };
    beforeEach(() => {
      sandbox
        .stub(officeSampleProvider, "OfficeSampleCollection")
        .resolves(fakedOfficeSampleConfig);
    });
    afterEach(() => {
      sandbox.restore();
      officeSampleProvider["officeSampleCollection"] = undefined;
    });

    it("get office sample download url info", async () => {
      const result = await utils.getOfficeSampleDownloadUrlInfo("Excel-Add-in-ShapeAPI-Dashboard");
      chai.expect(result).deep.equal({
        downloadUrlInfo: fakedOfficeSampleConfig.samples[0].downloadUrlInfo,
        host: "Excel",
      });
    });

    it("sample not found", async () => {
      try {
        await utils.getOfficeSampleDownloadUrlInfo("test");
        chai.assert.fail("Should not reach here.");
      } catch (error) {
        chai.expect((error as Error).message).equal("Sample not found");
      }
    });
  });
});

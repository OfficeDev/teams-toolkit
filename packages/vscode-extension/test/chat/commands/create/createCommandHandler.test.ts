import * as chai from "chai";
import * as chaiPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as createCommandHandler from "../../../../src/chat/commands/create/createCommandHandler";
import * as helper from "../../../../src/chat/commands/create/helper";
import { ProjectMetadata } from "../../../../src/chat/commands/create/types";
import * as telemetry from "../../../../src/chat/telemetry";
import * as util from "../../../../src/chat/utils";
import { ExtTelemetry } from "../../../../src/telemetry/extTelemetry";
import { CancellationToken } from "../../../mocks/vsc";

chai.use(chaiPromised);

describe("chat create command", () => {
  const sandbox = sinon.createSandbox();

  describe("createCommandHandler()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("returns default answer", async () => {
      const chatTelemetryDataMock = sandbox.createStubInstance(telemetry.ChatTelemetryData);
      sandbox.stub(chatTelemetryDataMock, "properties").get(function getterFn() {
        return undefined;
      });
      sandbox.stub(chatTelemetryDataMock, "measurements").get(function getterFn() {
        return undefined;
      });
      sandbox
        .stub(telemetry.ChatTelemetryData, "createByParticipant")
        .returns(chatTelemetryDataMock);
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

      const response = {
        markdown: sandbox.stub(),
      };
      const token = new CancellationToken();
      await createCommandHandler.default(
        { prompt: "" } as unknown as vscode.ChatRequest,
        {} as unknown as vscode.ChatContext,
        response as unknown as vscode.ChatResponseStream,
        token
      );
      chai.assert.isTrue(
        response.markdown.calledOnceWith(
          "Use this command to find relevant templates or samples to build your Teams app as per your description. E.g. @teams /create create an AI assistant bot that can complete common tasks."
        )
      );
      chai.assert.isTrue(sendTelemetryEventStub.calledTwice);
    });

    it("returns no result answer", async () => {
      const chatTelemetryDataMock = sandbox.createStubInstance(telemetry.ChatTelemetryData);
      sandbox.stub(chatTelemetryDataMock, "properties").get(function getterFn() {
        return undefined;
      });
      sandbox.stub(chatTelemetryDataMock, "measurements").get(function getterFn() {
        return undefined;
      });
      sandbox
        .stub(telemetry.ChatTelemetryData, "createByParticipant")
        .returns(chatTelemetryDataMock);
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const matchProjectStub = sandbox.stub(helper, "matchProject").resolves([]);

      const response = {
        markdown: sandbox.stub(),
      };
      const token = new CancellationToken();
      await createCommandHandler.default(
        { prompt: "test" } as unknown as vscode.ChatRequest,
        {} as unknown as vscode.ChatContext,
        response as unknown as vscode.ChatResponseStream,
        token
      );
      chai.assert.isTrue(
        response.markdown.calledOnceWith(
          "No matching templates or samples found. Try a different app description or explore other templates.\n"
        )
      );
    });

    it("has exactly 1 matched sample", async () => {
      const chatTelemetryDataMock = sandbox.createStubInstance(telemetry.ChatTelemetryData);
      sandbox.stub(chatTelemetryDataMock, "properties").get(function getterFn() {
        return undefined;
      });
      sandbox.stub(chatTelemetryDataMock, "measurements").get(function getterFn() {
        return undefined;
      });
      chatTelemetryDataMock.chatMessages = [];
      sandbox
        .stub(telemetry.ChatTelemetryData, "createByParticipant")
        .returns(chatTelemetryDataMock);
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const fakedSample = {
        id: "test-sample",
        type: "sample",
        platform: "Teams",
        name: "test sample",
        description: "test sample",
      } as ProjectMetadata;
      sandbox.stub(helper, "matchProject").resolves([fakedSample]);
      const showFileTreeStub = sandbox.stub(helper, "showFileTree");
      sandbox.stub(util, "verbatimCopilotInteraction");

      const response = {
        markdown: sandbox.stub(),
        button: sandbox.stub(),
      };
      const token = new CancellationToken();
      await createCommandHandler.default(
        { prompt: "test" } as unknown as vscode.ChatRequest,
        {} as unknown as vscode.ChatContext,
        response as unknown as vscode.ChatResponseStream,
        token
      );
      chai.assert.isTrue(showFileTreeStub.calledOnce);
    });

    it("has exactly 1 matched template", async () => {
      const chatTelemetryDataMock = sandbox.createStubInstance(telemetry.ChatTelemetryData);
      sandbox.stub(chatTelemetryDataMock, "properties").get(function getterFn() {
        return undefined;
      });
      sandbox.stub(chatTelemetryDataMock, "measurements").get(function getterFn() {
        return undefined;
      });
      chatTelemetryDataMock.chatMessages = [];
      sandbox
        .stub(telemetry.ChatTelemetryData, "createByParticipant")
        .returns(chatTelemetryDataMock);
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const fakedSample = {
        id: "test-template",
        type: "template",
        platform: "Teams",
        name: "test template",
        description: "test template",
      } as ProjectMetadata;
      sandbox.stub(helper, "matchProject").resolves([fakedSample]);
      const showFileTreeStub = sandbox.stub(helper, "showFileTree");
      sandbox.stub(util, "verbatimCopilotInteraction");

      const response = {
        markdown: sandbox.stub(),
        button: sandbox.stub(),
      };
      const token = new CancellationToken();
      await createCommandHandler.default(
        { prompt: "test" } as unknown as vscode.ChatRequest,
        {} as unknown as vscode.ChatContext,
        response as unknown as vscode.ChatResponseStream,
        token
      );
      chai.assert.isTrue(showFileTreeStub.notCalled);
    });

    it("has multiple matched results", async () => {
      const chatTelemetryDataMock = sandbox.createStubInstance(telemetry.ChatTelemetryData);
      sandbox.stub(chatTelemetryDataMock, "properties").get(function getterFn() {
        return undefined;
      });
      sandbox.stub(chatTelemetryDataMock, "measurements").get(function getterFn() {
        return undefined;
      });
      chatTelemetryDataMock.chatMessages = [];
      sandbox
        .stub(telemetry.ChatTelemetryData, "createByParticipant")
        .returns(chatTelemetryDataMock);
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const fakedSamples = [
        {
          id: "test-sample",
          type: "sample",
          platform: "Teams",
          name: "test sample",
          description: "test sample",
        },
        {
          id: "test-sample",
          type: "template",
          platform: "Teams",
          name: "test sample",
          description: "test sample",
        },
      ] as ProjectMetadata[];
      sandbox.stub(helper, "matchProject").resolves(fakedSamples);
      const showFileTreeStub = sandbox.stub(helper, "showFileTree");
      sandbox.stub(util, "verbatimCopilotInteraction");

      const response = {
        markdown: sandbox.stub(),
        button: sandbox.stub(),
      };
      const token = new CancellationToken();
      await createCommandHandler.default(
        { prompt: "test" } as unknown as vscode.ChatRequest,
        {} as unknown as vscode.ChatContext,
        response as unknown as vscode.ChatResponseStream,
        token
      );
      chai.assert.isTrue(showFileTreeStub.notCalled);
      chai.assert.isTrue(response.markdown.calledThrice);
      chai.assert.isTrue(response.button.calledTwice);
    });
  });
});

import * as chai from "chai";
import * as sinon from "sinon";
import * as fs from "fs-extra";
import { CancellationToken } from "../mocks/vsc";
import { URI } from "../mocks/vsc/uri";
import { TeamsChatCommand } from "../../src/chat/consts";
import * as handler from "../../src/chat/handlers";
import {
  ChatContext,
  ChatLocation,
  ChatRequest,
  ChatResponseStream,
  workspace,
  window,
  QuickPickItem,
  commands,
  ChatResultFeedback,
} from "vscode";
import * as createCommandHandler from "../../src/chat/commands/create/createCommandHandler";
import * as nextStepCommandHandler from "../../src/chat/commands/nextstep/nextstepCommandHandler";
import * as telemetry from "../../src/chat/telemetry";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../src/telemetry/extTelemetryEvents";
import * as util from "../../src/chat/utils";
import * as generatorUtil from "@microsoft/teamsfx-core/build/component/generator/utils";
import * as localizeUtils from "../../src/utils/localizeUtils";
import { ProjectMetadata } from "../../src/chat/commands/create/types";
import { Correlator } from "@microsoft/teamsfx-core";

describe("chat handlers", () => {
  const sandbox = sinon.createSandbox();

  describe("chatRequestHandler()", () => {
    const response = {
      markdown: sandbox.stub(),
      button: sandbox.stub(),
    };
    const token = new CancellationToken();

    afterEach(async () => {
      sandbox.restore();
    });

    it("call createCommandHandler", async () => {
      const request: ChatRequest = {
        prompt: "fakePrompt",
        command: TeamsChatCommand.Create,
        variables: [],
        location: ChatLocation.Panel,
      };
      const createCommandHandlerStub = sandbox.stub(createCommandHandler, "default");
      handler.chatRequestHandler(
        request,
        {} as unknown as ChatContext,
        response as unknown as ChatResponseStream,
        token
      );
      chai
        .expect(
          createCommandHandlerStub.calledOnceWith(
            request,
            {} as unknown as ChatContext,
            response as unknown as ChatResponseStream,
            token
          )
        )
        .to.equal(true);
    });

    it("call nextStepCommandHandler", async () => {
      const request: ChatRequest = {
        prompt: "fakePrompt",
        command: TeamsChatCommand.NextStep,
        variables: [],
        location: ChatLocation.Panel,
      };

      const nextStepCommandHandlerStub = sandbox.stub(nextStepCommandHandler, "default");
      handler.chatRequestHandler(
        request,
        {} as unknown as ChatContext,
        response as unknown as ChatResponseStream,
        token
      );
      chai
        .expect(
          nextStepCommandHandlerStub.calledOnceWith(
            request,
            {} as unknown as ChatContext,
            response as unknown as ChatResponseStream,
            token
          )
        )
        .to.equal(true);
    });

    it("call defaultHandler", async () => {
      const request: ChatRequest = {
        prompt: "fakePrompt",
        command: "",
        variables: [],
        location: ChatLocation.Panel,
      };

      const chatTelemetryDataMock = sandbox.createStubInstance(telemetry.ChatTelemetryData);
      const metaDataMock = { metadata: { command: undefined, requestId: undefined } };
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
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(util, "verbatimCopilotInteraction");
      const result = await handler.chatRequestHandler(
        request,
        {} as unknown as ChatContext,
        response as unknown as ChatResponseStream,
        token
      );

      chai.expect(result).to.deep.equal(metaDataMock);
    });
  });

  describe("chatCreateCommandHandler()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("choose no folder", async () => {
      sandbox.stub(workspace, "workspaceFolders").value([{ uri: { fsPath: "workspacePath" } }]);
      const fsCopyStub = sandbox.stub(fs, "copy");
      const showQuickPickStub = sandbox
        .stub(window, "showQuickPick")
        .returns(Promise.resolve(undefined));
      const result = await handler.chatCreateCommandHandler("fakeFolder");

      chai.expect(result).to.equal(undefined);
      chai.expect(showQuickPickStub.calledOnce).to.equal(true);
      chai.expect(fsCopyStub.called).to.equal(false);
    });

    it("choose workspace folder", async () => {
      sandbox.stub(workspace, "workspaceFolders").value([{ uri: { fsPath: "workspacePath" } }]);
      const showQuickPickStub = sandbox
        .stub(window, "showQuickPick")
        .returns(Promise.resolve("Current Workspace") as unknown as Promise<QuickPickItem>);
      const fsCopyStub = sandbox.stub(fs, "copy");
      const showOpenDialogStub = sandbox.stub(window, "showOpenDialog");
      const showInformationMessageStub = sandbox.stub(window, "showInformationMessage");
      const executeCommandStub = sandbox.stub(commands, "executeCommand");
      sandbox.stub(localizeUtils, "localize").returns("Current Workspace");
      await handler.chatCreateCommandHandler("fakeFolder");

      chai.expect(showQuickPickStub.calledOnce).to.equal(true);
      chai.expect(showOpenDialogStub.called).to.equal(false);
      chai.expect(fsCopyStub.args[0]).to.deep.equal(["fakeFolder", "workspacePath"]);
      chai.expect(fsCopyStub.calledOnce).to.equal(true);
      chai.expect(showInformationMessageStub.calledOnce).to.equal(true);
      chai
        .expect(executeCommandStub.calledOnceWith("workbench.view.extension.teamsfx"))
        .to.equal(true);
    });

    it("choose to browse and select no folder", async () => {
      sandbox.stub(workspace, "workspaceFolders").value([{ uri: { fsPath: "workspacePath" } }]);
      const showQuickPickStub = sandbox
        .stub(window, "showQuickPick")
        .returns(Promise.resolve("Browse...") as unknown as Promise<QuickPickItem>);
      const fsCopyStub = sandbox.stub(fs, "copy");
      const showOpenDialogStub = sandbox
        .stub(window, "showOpenDialog")
        .returns(Promise.resolve(undefined));
      const showInformationMessageStub = sandbox.stub(window, "showInformationMessage");
      const executeCommandStub = sandbox.stub(commands, "executeCommand");
      sandbox.stub(localizeUtils, "localize").returns("Current Workspace");
      await handler.chatCreateCommandHandler("fakeFolder");

      chai.expect(showQuickPickStub.calledOnce).to.equal(true);
      chai.expect(showOpenDialogStub.calledOnce).to.equal(true);
      chai.expect(fsCopyStub.called).to.equal(false);
      chai.expect(showInformationMessageStub.called).to.equal(false);
      chai.expect(executeCommandStub.called).to.equal(false);
    });

    it("choose to browse and select custom folder", async () => {
      sandbox.stub(workspace, "workspaceFolders").value([{ uri: { fsPath: "workspacePath" } }]);
      const showQuickPickStub = sandbox
        .stub(window, "showQuickPick")
        .returns(Promise.resolve("Browse...") as unknown as Promise<QuickPickItem>);
      const fsCopyStub = sandbox.stub(fs, "copy");
      const customFolderPath = "customFolderPath";
      const customFolder: URI[] = [URI.file(customFolderPath)];
      const showOpenDialogStub = sandbox
        .stub(window, "showOpenDialog")
        .returns(Promise.resolve(customFolder));
      const showInformationMessageStub = sandbox.stub(window, "showInformationMessage");
      const executeCommandStub = sandbox.stub(commands, "executeCommand");
      sandbox.stub(localizeUtils, "localize").returns("Current Workspace");
      await handler.chatCreateCommandHandler("fakeFolder");

      chai.expect(showQuickPickStub.calledOnce).to.equal(true);
      chai.expect(showOpenDialogStub.calledOnce).to.equal(true);
      chai.expect(fsCopyStub.args[0]).to.deep.equal(["fakeFolder", "\\" + customFolderPath]);
      chai.expect(fsCopyStub.calledOnce).to.equal(true);
      chai.expect(showInformationMessageStub.called).to.equal(false);
      chai
        .expect(executeCommandStub.calledOnceWith("vscode.openFolder", URI.file(customFolderPath)))
        .to.equal(true);
    });

    it("download sample", async () => {
      const fakedSampleUrlInfo = {
        owner: "test-owner",
        repository: "test-repo",
        ref: "test-ref",
        dir: "test-dir",
      } as generatorUtil.SampleUrlInfo;
      const fakedSample = {
        id: "test-sample",
        type: "sample",
        platform: "Teams",
        name: "test sample",
        description: "test sample",
      } as ProjectMetadata;

      sandbox.stub(workspace, "workspaceFolders").value([{ uri: { fsPath: "workspacePath" } }]);
      const showQuickPickStub = sandbox
        .stub(window, "showQuickPick")
        .returns(Promise.resolve("Current Workspace") as unknown as Promise<QuickPickItem>);
      const showOpenDialogStub = sandbox.stub(window, "showOpenDialog");
      const showInformationMessageStub = sandbox.stub(window, "showInformationMessage");
      const executeCommandStub = sandbox.stub(commands, "executeCommand");
      const getSampleDownloadUrlInfoStub = sandbox
        .stub(util, "getSampleDownloadUrlInfo")
        .returns(Promise.resolve(fakedSampleUrlInfo));
      const downloadDirectoryStub = sandbox.stub(generatorUtil, "downloadDirectory");
      sandbox.stub(localizeUtils, "localize").returns("Current Workspace");

      await handler.chatCreateCommandHandler(fakedSample);

      chai.expect(showQuickPickStub.calledOnce).to.equal(true);
      chai.expect(showOpenDialogStub.called).to.equal(false);
      chai.expect(getSampleDownloadUrlInfoStub.args[0]).to.deep.equal([fakedSample.id]);
      chai.expect(getSampleDownloadUrlInfoStub.calledOnce).to.equal(true);
      chai
        .expect(downloadDirectoryStub.args[0])
        .to.deep.equal([fakedSampleUrlInfo, "workspacePath", 2, 20]);
      chai.expect(downloadDirectoryStub.calledOnce).to.equal(true);
      chai.expect(showInformationMessageStub.calledOnce).to.equal(true);
      chai
        .expect(executeCommandStub.calledOnceWith("workbench.view.extension.teamsfx"))
        .to.equal(true);
    });

    it("copy files error", async () => {
      const copyError = new Error("fakeError");
      sandbox.stub(workspace, "workspaceFolders").value([{ uri: { fsPath: "workspacePath" } }]);
      const showQuickPickStub = sandbox
        .stub(window, "showQuickPick")
        .returns(Promise.resolve("Current Workspace") as unknown as Promise<QuickPickItem>);
      const fsCopyStub = sandbox.stub(fs, "copy").throwsException(copyError);
      const showOpenDialogStub = sandbox.stub(window, "showOpenDialog");
      const showErrorMessageStub = sandbox.stub(window, "showErrorMessage");
      const consoleLogStub = sandbox.stub(console, "error");
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => {
        if (key === "teamstoolkit.chatParticipants.create.failToCreate") return "Fail to Create";
        else return "Current Workspace";
      });
      await handler.chatCreateCommandHandler("fakeFolder");

      chai.expect(showQuickPickStub.calledOnce).to.equal(true);
      chai.expect(showOpenDialogStub.called).to.equal(false);
      chai.expect(fsCopyStub.calledOnce).to.equal(true);
      chai.expect(consoleLogStub.args[0][0]).to.equal("Error copying files:");
      chai.expect(consoleLogStub.args[0][1]).to.deep.equal(copyError);
      chai.expect(consoleLogStub.calledOnce).to.equal(true);
      chai.expect(showErrorMessageStub.args[0]).to.deep.equal(["Fail to Create"]);
      chai.expect(showErrorMessageStub.calledOnce).to.equal(true);
    });
  });

  describe("chatExecuteCommandHandler()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("execute commands", async () => {
      const chatTelemetryDataMock = sandbox.createStubInstance(telemetry.ChatTelemetryData);
      sandbox.stub(chatTelemetryDataMock, "properties").get(function getterFn() {
        return undefined;
      });
      sandbox.stub(chatTelemetryDataMock, "measurements").get(function getterFn() {
        return undefined;
      });
      chatTelemetryDataMock.requestId = "fakeRequestId";
      sandbox.stub(telemetry.ChatTelemetryData, "get").returns(chatTelemetryDataMock);
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const executeCommandStub = sandbox.stub(commands, "executeCommand");
      await handler.chatExecuteCommandHandler("fakeCommand", "fakeRequestId", ["fakeArgs"]);

      chai.expect(sendTelemetryEventStub.calledOnce).to.equal(true);
      chai.expect(executeCommandStub.calledOnce).to.equal(true);
    });
  });

  describe("handleFeedback()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("handle feedback", async () => {
      const fakeFeedback: ChatResultFeedback = {
        result: {},
        kind: 1,
      };
      sandbox.stub(Correlator, "getId").returns("testCorrelationId");
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      handler.handleFeedback(fakeFeedback);

      chai.expect(sendTelemetryEventStub.calledOnce).to.equal(true);
      chai.expect(sendTelemetryEventStub.args[0]).to.deep.equal([
        TelemetryEvent.CopilotChatFeedback,
        {
          [TelemetryProperty.CopilotChatRequestId]: "",
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CopilotChat,
          [TelemetryProperty.CopilotChatCommand]: "",
          [TelemetryProperty.CorrelationId]: "testCorrelationId",
        },
        {
          [TelemetryProperty.CopilotChatFeedbackHelpful]: 1,
        },
      ]);
    });
  });
});

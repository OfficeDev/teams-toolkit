import * as chai from "chai";
import * as sinon from "sinon";
import * as chaipromised from "chai-as-promised";
import * as vscode from "vscode";
import * as fs from "fs-extra";
import * as path from "path";
import * as handler from "../../src/officeChat/handlers";
import * as telemetry from "../../src/chat/telemetry";
import * as util from "../../src/chat/utils";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as officeCreateCommandHandler from "../../src/officeChat/commands/create/officeCreateCommandHandler";
import * as generatecodeCommandHandler from "../../src/officeChat/commands/generatecode/generatecodeCommandHandler";
import * as officeNextStepCommandHandler from "../../src/officeChat/commands/nextStep/officeNextstepCommandHandler";
import { URI } from "../mocks/vsc/uri";
import { OfficeChatCommand } from "../../src/officeChat/consts";
import { CancellationToken } from "../mocks/vsc";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../src/telemetry/extTelemetryEvents";
import { Correlator } from "@microsoft/teamsfx-core";

chai.use(chaipromised);

describe("File: officeChat/handlers.ts", () => {
  const sandbox = sinon.createSandbox();

  describe("Method: officeChatRequestHandler", () => {
    const response = {
      markdown: sandbox.stub(),
      button: sandbox.stub(),
    };
    const token = new CancellationToken();
    afterEach(() => {
      sandbox.restore();
    });

    it("call officeCreateCommandHandler", async () => {
      const request: vscode.ChatRequest = {
        prompt: "test",
        command: OfficeChatCommand.Create,
        references: [],
        location: vscode.ChatLocation.Panel,
        attempt: 0,
        enableCommandDetection: false,
      };
      const officeCreateCommandHandlerStub = sandbox.stub(officeCreateCommandHandler, "default");
      handler.officeChatRequestHandler(
        request,
        {} as unknown as vscode.ChatContext,
        response as unknown as vscode.ChatResponseStream,
        token
      );
      chai.expect(officeCreateCommandHandlerStub.calledOnce);
    });

    it("call generatecodeCommandHandler", async () => {
      const request: vscode.ChatRequest = {
        prompt: "test",
        command: OfficeChatCommand.GenerateCode,
        references: [],
        location: vscode.ChatLocation.Panel,
        attempt: 0,
        enableCommandDetection: false,
      };
      const generatecodeCommandHandlerStub = sandbox.stub(generatecodeCommandHandler, "default");
      handler.officeChatRequestHandler(
        request,
        {} as unknown as vscode.ChatContext,
        response as unknown as vscode.ChatResponseStream,
        token
      );
      chai.expect(generatecodeCommandHandlerStub.calledOnce);
    });

    it("call officeNextStepCommandHandler", async () => {
      const request: vscode.ChatRequest = {
        prompt: "test",
        command: OfficeChatCommand.NextStep,
        references: [],
        location: vscode.ChatLocation.Panel,
        attempt: 0,
        enableCommandDetection: false,
      };
      const officeNextStepCommandHandlerStub = sandbox.stub(
        officeNextStepCommandHandler,
        "default"
      );
      handler.officeChatRequestHandler(
        request,
        {} as unknown as vscode.ChatContext,
        response as unknown as vscode.ChatResponseStream,
        token
      );
      chai.expect(officeNextStepCommandHandlerStub.calledOnce);
    });

    it("call officeDefaultHandler", async () => {
      const request: vscode.ChatRequest = {
        prompt: "test",
        command: "",
        references: [],
        location: vscode.ChatLocation.Panel,
        attempt: 0,
        enableCommandDetection: false,
      };
      const officeChatTelemetryDataMock = sandbox.createStubInstance(telemetry.ChatTelemetryData);
      sandbox.stub(officeChatTelemetryDataMock, "properties").get(function getterFn() {
        return undefined;
      });
      sandbox.stub(officeChatTelemetryDataMock, "measurements").get(function getterFn() {
        return undefined;
      });
      officeChatTelemetryDataMock.chatMessages = [];
      sandbox
        .stub(telemetry.ChatTelemetryData, "createByParticipant")
        .returns(officeChatTelemetryDataMock);
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const verbatimCopilotInteractionStub = sandbox.stub(util, "verbatimCopilotInteraction");
      await handler.officeChatRequestHandler(
        request,
        {} as unknown as vscode.ChatContext,
        response as unknown as vscode.ChatResponseStream,
        token
      );
      chai.expect(verbatimCopilotInteractionStub.calledOnce);
    });

    it("call officeDefaultHandler - error", async () => {
      const request: vscode.ChatRequest = {
        prompt: "",
        command: "",
        references: [],
        location: vscode.ChatLocation.Panel,
        attempt: 0,
        enableCommandDetection: false,
      };
      const officeChatTelemetryDataMock = sandbox.createStubInstance(telemetry.ChatTelemetryData);
      sandbox.stub(officeChatTelemetryDataMock, "properties").get(function getterFn() {
        return undefined;
      });
      sandbox.stub(officeChatTelemetryDataMock, "measurements").get(function getterFn() {
        return undefined;
      });
      officeChatTelemetryDataMock.chatMessages = [];
      sandbox
        .stub(telemetry.ChatTelemetryData, "createByParticipant")
        .returns(officeChatTelemetryDataMock);
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(util, "verbatimCopilotInteraction");
      await chai.expect(
        handler.officeChatRequestHandler(
          request,
          {} as unknown as vscode.ChatContext,
          response as unknown as vscode.ChatResponseStream,
          token
        )
      ).is.rejectedWith(`
Please specify a question when using this command.

Usage: @office Ask questions about Office Add-ins development.`);
    });
  });

  describe("method: chatCreateOfficeProjectCommandHandler", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("undefined workspace folders", async () => {
      sandbox.stub(vscode.workspace, "workspaceFolders").value(undefined);
      const showQuickPickStub = sandbox
        .stub(vscode.window, "showQuickPick")
        .returns(Promise.resolve("Browse...") as unknown as Promise<vscode.QuickPickItem>);
      const fsCopyStub = sandbox.stub(fs, "copy");
      const customFolderPath = "customFolderPath";
      const customFolder: URI[] = [URI.file(customFolderPath)];
      const showOpenDialogStub = sandbox
        .stub(vscode.window, "showOpenDialog")
        .returns(Promise.resolve(customFolder));
      const showInformationMessageStub = sandbox.stub(vscode.window, "showInformationMessage");
      const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");
      sandbox.stub(localizeUtils, "localize").returns("Current Workspace");
      await handler.chatCreateOfficeProjectCommandHandler("fakeFolder");

      chai.expect(showQuickPickStub.called).to.equal(false);
      chai.expect(showOpenDialogStub.calledOnce).to.equal(true);
      chai.expect(fsCopyStub.args[0][0]).to.equal("fakeFolder");
      chai.expect(path.basename(fsCopyStub.args[0][1])).to.equal(customFolderPath);
      chai.expect(fsCopyStub.calledOnce).to.equal(true);
      chai.expect(showInformationMessageStub.called).to.equal(false);
      chai
        .expect(executeCommandStub.calledOnceWith("vscode.openFolder", URI.file(customFolderPath)))
        .to.equal(true);
    });

    it("choose no folder", async () => {
      sandbox
        .stub(vscode.workspace, "workspaceFolders")
        .value([{ uri: { fsPath: "workspacePath" } }]);
      const fsCopyStub = sandbox.stub(fs, "copy");
      const showQuickPickStub = sandbox
        .stub(vscode.window, "showQuickPick")
        .returns(Promise.resolve(undefined));
      const result = await handler.chatCreateOfficeProjectCommandHandler("fakeFolder");

      chai.expect(result).to.equal(undefined);
      chai.expect(showQuickPickStub.calledOnce).to.equal(true);
      chai.expect(fsCopyStub.called).to.equal(false);
    });

    it("choose workspace folder", async () => {
      sandbox
        .stub(vscode.workspace, "workspaceFolders")
        .value([{ uri: { fsPath: "workspacePath" } }]);
      const showQuickPickStub = sandbox
        .stub(vscode.window, "showQuickPick")
        .returns(Promise.resolve("Current Workspace") as unknown as Promise<vscode.QuickPickItem>);
      const fsCopyStub = sandbox.stub(fs, "copy");
      const showOpenDialogStub = sandbox.stub(vscode.window, "showOpenDialog");
      const showInformationMessageStub = sandbox.stub(vscode.window, "showInformationMessage");
      const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");
      sandbox.stub(localizeUtils, "localize").returns("Current Workspace");
      await handler.chatCreateOfficeProjectCommandHandler("fakeFolder");

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
      sandbox
        .stub(vscode.workspace, "workspaceFolders")
        .value([{ uri: { fsPath: "workspacePath" } }]);
      const showQuickPickStub = sandbox
        .stub(vscode.window, "showQuickPick")
        .returns(Promise.resolve("Browse...") as unknown as Promise<vscode.QuickPickItem>);
      const fsCopyStub = sandbox.stub(fs, "copy");
      const showOpenDialogStub = sandbox
        .stub(vscode.window, "showOpenDialog")
        .returns(Promise.resolve(undefined));
      const showInformationMessageStub = sandbox.stub(vscode.window, "showInformationMessage");
      const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");
      sandbox.stub(localizeUtils, "localize").returns("Current Workspace");
      await handler.chatCreateOfficeProjectCommandHandler("fakeFolder");

      chai.expect(showQuickPickStub.calledOnce).to.equal(true);
      chai.expect(showOpenDialogStub.calledOnce).to.equal(true);
      chai.expect(fsCopyStub.called).to.equal(false);
      chai.expect(showInformationMessageStub.called).to.equal(false);
      chai.expect(executeCommandStub.called).to.equal(false);
    });

    it("choose to browse and select custom folder", async () => {
      sandbox
        .stub(vscode.workspace, "workspaceFolders")
        .value([{ uri: { fsPath: "workspacePath" } }]);
      const showQuickPickStub = sandbox
        .stub(vscode.window, "showQuickPick")
        .returns(Promise.resolve("Browse...") as unknown as Promise<vscode.QuickPickItem>);
      const fsCopyStub = sandbox.stub(fs, "copy");
      const customFolderPath = "customFolderPath";
      const customFolder: URI[] = [URI.file(customFolderPath)];
      const showOpenDialogStub = sandbox
        .stub(vscode.window, "showOpenDialog")
        .returns(Promise.resolve(customFolder));
      const showInformationMessageStub = sandbox.stub(vscode.window, "showInformationMessage");
      const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");
      sandbox.stub(localizeUtils, "localize").returns("Current Workspace");
      await handler.chatCreateOfficeProjectCommandHandler("fakeFolder");

      chai.expect(showQuickPickStub.calledOnce).to.equal(true);
      chai.expect(showOpenDialogStub.calledOnce).to.equal(true);
      chai.expect(fsCopyStub.args[0][0]).to.equal("fakeFolder");
      chai.expect(path.basename(fsCopyStub.args[0][1])).to.equal(customFolderPath);
      chai.expect(fsCopyStub.calledOnce).to.equal(true);
      chai.expect(showInformationMessageStub.called).to.equal(false);
      chai
        .expect(executeCommandStub.calledOnceWith("vscode.openFolder", URI.file(customFolderPath)))
        .to.equal(true);
    });

    it("copy files error", async () => {
      const copyError = new Error("fakeError");
      sandbox
        .stub(vscode.workspace, "workspaceFolders")
        .value([{ uri: { fsPath: "workspacePath" } }]);
      const showQuickPickStub = sandbox
        .stub(vscode.window, "showQuickPick")
        .returns(Promise.resolve("Current Workspace") as unknown as Promise<vscode.QuickPickItem>);
      const fsCopyStub = sandbox.stub(fs, "copy").throwsException(copyError);
      const showOpenDialogStub = sandbox.stub(vscode.window, "showOpenDialog");
      const showErrorMessageStub = sandbox.stub(vscode.window, "showErrorMessage");
      const consoleLogStub = sandbox.stub(console, "error");
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => {
        if (key === "teamstoolkit.chatParticipants.officeAddIn.create.failToCreate")
          return "Fail to Create";
        else return "Current Workspace";
      });
      await handler.chatCreateOfficeProjectCommandHandler("fakeFolder");

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

  describe("Method: handleOfficeFeedback", () => {
    afterEach(() => {
      sandbox.restore();
    });

    it("handle feedback with undefined request id and command", async () => {
      const fakedFeedback: vscode.ChatResultFeedback = {
        result: {},
        kind: 1,
      };
      sandbox.stub(Correlator, "getId").returns("testCorrelationId");
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      handler.handleOfficeFeedback(fakedFeedback);

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

    it("handle feedback with request id and command", async () => {
      const fakeFeedback: vscode.ChatResultFeedback = {
        result: {
          metadata: {
            requestId: "testRequestId",
            command: "testCommand",
          },
        },
        kind: 0,
      };
      sandbox.stub(Correlator, "getId").returns("testCorrelationId");
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      handler.handleOfficeFeedback(fakeFeedback);

      chai.expect(sendTelemetryEventStub.calledOnce).to.equal(true);
      chai.expect(sendTelemetryEventStub.args[0]).to.deep.equal([
        TelemetryEvent.CopilotChatFeedback,
        {
          [TelemetryProperty.CopilotChatRequestId]: "testRequestId",
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CopilotChat,
          [TelemetryProperty.CopilotChatCommand]: "testCommand",
          [TelemetryProperty.CorrelationId]: "testCorrelationId",
        },
        {
          [TelemetryProperty.CopilotChatFeedbackHelpful]: 0,
        },
      ]);
    });
  });

  describe("Method: handleOfficeUserAction", () => {
    const action = { kind: "copy" } as vscode.ChatCopyAction;
    afterEach(() => {
      sandbox.restore();
    });

    it("handle user action with undefined request id and command", async () => {
      const userActionEvent: vscode.ChatUserActionEvent = {
        result: {},
        action: action,
      };
      sandbox.stub(Correlator, "getId").returns("testCorrelationId");
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      handler.handleOfficeUserAction(userActionEvent);

      chai.expect(sendTelemetryEventStub.calledOnce).to.equal(true);
      chai.expect(sendTelemetryEventStub.args[0]).to.deep.equal([
        TelemetryEvent.CopilotChatUserAction,
        {
          [TelemetryProperty.CopilotChatRequestId]: "",
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CopilotChat,
          [TelemetryProperty.CopilotChatCommand]: "",
          [TelemetryProperty.CorrelationId]: "testCorrelationId",
          [TelemetryProperty.CopilotChatUserAction]: "copy",
        },
        {},
      ]);
    });

    it("handle feedback with request id and command", async () => {
      const userActionEvent: vscode.ChatUserActionEvent = {
        result: {
          metadata: {
            requestId: "testRequestId",
            command: "testCommand",
          },
        },
        action: action,
      };
      sandbox.stub(Correlator, "getId").returns("testCorrelationId");
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      handler.handleOfficeUserAction(userActionEvent);

      chai.expect(sendTelemetryEventStub.calledOnce).to.equal(true);
      chai.expect(sendTelemetryEventStub.args[0]).to.deep.equal([
        TelemetryEvent.CopilotChatUserAction,
        {
          [TelemetryProperty.CopilotChatRequestId]: "testRequestId",
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CopilotChat,
          [TelemetryProperty.CopilotChatCommand]: "testCommand",
          [TelemetryProperty.CorrelationId]: "testCorrelationId",
          [TelemetryProperty.CopilotChatUserAction]: "copy",
        },
        {},
      ]);
    });
  });
});

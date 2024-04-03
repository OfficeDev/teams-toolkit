import * as chai from "chai";
import * as sinon from "sinon";
import * as fs from "fs-extra";
import { CancellationToken } from "../mocks/vsc";
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
} from "vscode";
import * as createCommandHandler from "../../src/chat/commands/create/createCommandHandler";
import * as nextStepCommandHandler from "../../src/chat/commands/nextstep/nextstepCommandHandler";
import * as telemetry from "../../src/chat/telemetry";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import * as util from "../../src/chat/utils";
import * as localizeUtils from "../../src/utils/localizeUtils";

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

    it("no folder choice", async () => {
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

    it("quick pick folder choice", async () => {
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
  });
});

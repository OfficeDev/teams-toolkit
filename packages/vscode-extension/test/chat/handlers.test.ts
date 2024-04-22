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
  env,
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
import * as path from "path";
import { openUrlCommandHandler } from "../../src/chat/handlers";
import { request } from "http";
import { CommandKey } from "../../src/constants";

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
        attempt: 0,
        enableCommandDetection: false,
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
        attempt: 0,
        enableCommandDetection: false,
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
        attempt: 0,
        enableCommandDetection: false,
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

    it("execute commands with undefined chat telemetry data", async () => {
      sandbox.stub(telemetry.ChatTelemetryData, "get").returns(undefined);
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const executeCommandStub = sandbox.stub(commands, "executeCommand");
      await handler.chatExecuteCommandHandler(CommandKey.OpenReadMe, "fakeRequestId", ["fakeArgs"]);

      chai.expect(sendTelemetryEventStub.called).to.equal(false);
      chai.expect(executeCommandStub.calledOnce).to.equal(true);
    });
  });

  describe("openUrlCommandHandler()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("open external", async () => {
      await openUrlCommandHandler("fakeUrl");
    });
  });

  describe("handleFeedback()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("handle feedback with undefined request id and command", async () => {
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

    it("handle feedback with request id and command", async () => {
      const fakeFeedback: ChatResultFeedback = {
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
      handler.handleFeedback(fakeFeedback);

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
});

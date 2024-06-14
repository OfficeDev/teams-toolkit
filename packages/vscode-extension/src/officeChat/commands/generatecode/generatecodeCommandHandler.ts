// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatMessage,
  LanguageModelChatMessageRole,
} from "vscode";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryProperty } from "../../../telemetry/extTelemetryEvents";
import { localize } from "../../../utils/localizeUtils";
import { OfficeChatCommand, officeChatParticipantId } from "../../consts";
import { Planner } from "../../common/planner";
import { ChatTelemetryData } from "../../../chat/telemetry";
import { isInputHarmful } from "../../utils";
import { ICopilotChatOfficeResult } from "../../types";

export default async function generatecodeCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatOfficeResult> {
  const officeChatTelemetryData = ChatTelemetryData.createByParticipant(
    officeChatParticipantId,
    OfficeChatCommand.GenerateCode
  );
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatStart,
    officeChatTelemetryData.properties
  );

  if (request.prompt.trim() === "") {
    officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTimeToFirstToken] =
      Date.now() - officeChatTelemetryData.startTime;
    response.markdown(
      localize("teamstoolkit.chatParticipants.officeAddIn.generateCode.noPromptAnswer")
    );
    officeChatTelemetryData.properties[TelemetryProperty.CopilotChatBlockReason] = "Empty Input";
    officeChatTelemetryData.markComplete();
    ExtTelemetry.sendTelemetryEvent(
      TelemetryEvent.CopilotChat,
      officeChatTelemetryData.properties,
      officeChatTelemetryData.measurements
    );
    return {
      metadata: {
        command: OfficeChatCommand.GenerateCode,
        requestId: officeChatTelemetryData.requestId,
      },
    };
  }

  if (process.env.NODE_ENV === "development") {
    const localScenarioHandlers = await import("../../../../test/officeChat/mocks/localTuning");
    if (request.prompt in localScenarioHandlers) {
      const scenarioName = request.prompt as keyof typeof localScenarioHandlers;
      await localScenarioHandlers[scenarioName](request, context, response, token);

      return {
        metadata: {
          command: OfficeChatCommand.GenerateCode,
          requestId: officeChatTelemetryData.requestId,
        },
      };
    }
  }

  officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTotalTokens] = 0;
  officeChatTelemetryData.properties[TelemetryProperty.CopilotChatResponseTokensPerSecond] = "";
  const isHarmful = await isInputHarmful(request, token, officeChatTelemetryData);
  if (!isHarmful) {
    const chatResult = await Planner.getInstance().processRequest(
      new LanguageModelChatMessage(LanguageModelChatMessageRole.User, request.prompt),
      request,
      response,
      token,
      OfficeChatCommand.GenerateCode,
      officeChatTelemetryData
    );
    officeChatTelemetryData.markComplete();
    officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTotalTokensPerSecond] =
      officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTotalTokens] /
      (officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTimeToComplete] / 1000);
    ExtTelemetry.sendTelemetryEvent(
      TelemetryEvent.CopilotChat,
      officeChatTelemetryData.properties,
      officeChatTelemetryData.measurements
    );
    return chatResult;
  } else {
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.harmfulInputResponse"));
    officeChatTelemetryData.properties[TelemetryProperty.CopilotChatBlockReason] = "RAI";
    officeChatTelemetryData.markComplete();
    officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTotalTokensPerSecond] =
      officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTotalTokens] /
      (officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTimeToComplete] / 1000);
    ExtTelemetry.sendTelemetryEvent(
      TelemetryEvent.CopilotChat,
      officeChatTelemetryData.properties,
      officeChatTelemetryData.measurements
    );
    return {
      metadata: {
        command: OfficeChatCommand.GenerateCode,
        requestId: officeChatTelemetryData.requestId,
      },
    };
  }
}

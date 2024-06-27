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
import { TelemetryEvent } from "../../../telemetry/extTelemetryEvents";
import { localize } from "../../../utils/localizeUtils";
import { OfficeChatCommand, officeChatParticipantId } from "../../consts";
import { Planner } from "../../common/planner";
import { isInputHarmful } from "../../utils";
import { ICopilotChatOfficeResult } from "../../types";
import { OfficeChatTelemetryBlockReasonEnum, OfficeChatTelemetryData } from "../../telemetry";

export default async function generatecodeCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatOfficeResult> {
  const officeChatTelemetryData = OfficeChatTelemetryData.createByParticipant(
    officeChatParticipantId,
    OfficeChatCommand.GenerateCode
  );
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatStart,
    officeChatTelemetryData.properties
  );

  if (request.prompt.trim() === "") {
    officeChatTelemetryData.setTimeToFirstToken();
    response.markdown(
      localize("teamstoolkit.chatParticipants.officeAddIn.generateCode.noPromptAnswer")
    );
    officeChatTelemetryData.setBlockReason(OfficeChatTelemetryBlockReasonEnum.UnsupportedInput);
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
    ExtTelemetry.sendTelemetryEvent(
      TelemetryEvent.CopilotChat,
      officeChatTelemetryData.properties,
      officeChatTelemetryData.measurements
    );
    return chatResult;
  } else {
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.harmfulInputResponse"));
    officeChatTelemetryData.setBlockReason(OfficeChatTelemetryBlockReasonEnum.RAI);
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
}

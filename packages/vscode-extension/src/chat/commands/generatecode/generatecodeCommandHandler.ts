// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatUserMessage,
} from "vscode";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { TelemetryEvent } from "../../../telemetry/extTelemetryEvents";
import { localize } from "../../../utils/localizeUtils";
import { OfficeAddinChatCommand, officeAddinChatParticipantId } from "../../consts";
import { Planner } from "../../officeCommon/planner";
import { ChatTelemetryData } from "../../telemetry";
import { ICopilotChatResult } from "../../types";
import { isInputHarmful } from "../../utils";

// TODO: Implement the function.
export default async function generatecodeCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const officeAddinChatTelemetryData = ChatTelemetryData.createByParticipant(
    officeAddinChatParticipantId,
    OfficeAddinChatCommand.GenerateCode,
    request.location
  );
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatStart,
    officeAddinChatTelemetryData.properties
  );

  if (process.env.NODE_ENV === "development") {
    const localScenarioHandlers = await import("../../localTuning");
    if (request.prompt in localScenarioHandlers) {
      const scenarioName = request.prompt as keyof typeof localScenarioHandlers;
      await localScenarioHandlers[scenarioName](request, context, response, token);

      return {
        metadata: {
          command: OfficeAddinChatCommand.GenerateCode,
          requestId: officeAddinChatTelemetryData.requestId,
        },
      };
    }
  }

  const isHarmful = await isInputHarmful(request, token);
  if (!isHarmful) {
    return await Planner.getInstance().processRequest(
      new LanguageModelChatUserMessage(request.prompt),
      request,
      response,
      token,
      OfficeAddinChatCommand.GenerateCode,
      officeAddinChatTelemetryData
    );
  } else {
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.harmfulInputResponse"));
    officeAddinChatTelemetryData.markComplete();
    ExtTelemetry.sendTelemetryEvent(
      TelemetryEvent.CopilotChat,
      officeAddinChatTelemetryData.properties,
      officeAddinChatTelemetryData.measurements
    );
    return {
      metadata: {
        command: OfficeAddinChatCommand.GenerateCode,
        requestId: officeAddinChatTelemetryData.requestId,
      },
    };
  }
}

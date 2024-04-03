// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ChatRequest,
  ChatContext,
  ChatResponseStream,
  CancellationToken,
  LanguageModelChatUserMessage,
} from "vscode";
import { OfficeAddinChatCommand, officeAddinChatParticipantId } from "../../consts";
import { ICopilotChatResult } from "../../types";
import { Planner } from "../../officeCommon/planner";
import { isInputHarmful } from "../../utils";
import { localize } from "../../../utils/localizeUtils";
import { ChatTelemetryData } from "../../telemetry";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { TelemetryEvent } from "../../../telemetry/extTelemetryEvents";

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

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ChatRequest,
  ChatContext,
  ChatResponseStream,
  CancellationToken,
  LanguageModelChatUserMessage,
} from "vscode";
import { OfficeAddinChatCommand } from "../../consts";
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
  const chatTelemetryData = ChatTelemetryData.createByCommand(OfficeAddinChatCommand.Create);
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CopilotChatStart, chatTelemetryData.properties);
  const isHarmful = await isInputHarmful(request, token);
  if (!isHarmful) {
    return await Planner.getInstance().processRequest(
      new LanguageModelChatUserMessage(request.prompt),
      request,
      response,
      token,
      OfficeAddinChatCommand.GenerateCode
    );
  } else {
    response.markdown(localize("teamstoolkit.chatParticipants.officeaddin.harmfulInputResponse"));
    return {
      metadata: {
        command: OfficeAddinChatCommand.GenerateCode,
        requestId: chatTelemetryData.requestId,
      },
    };
  }
}

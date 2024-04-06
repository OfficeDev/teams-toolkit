// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatUserMessage,
  window,
} from "vscode";

import {
  OfficeAddinChatCommand,
  officeAddinChatParticipantId,
  CHAT_CREATE_OFFICEADDIN_SAMPLE_COMMAND_ID,
  TeamsChatCommand,
  CHAT_EXECUTE_COMMAND_ID,
  CHAT_CREATE_OFFICEADDIN_TEMPLATE_COMMAND_ID,
} from "../../consts";
import { verbatimCopilotInteraction, isInputHarmful } from "../../utils";
import { ICopilotChatResult } from "../../types";
import { describeOfficeAddinProjectSystemPrompt } from "../../officeAddinPrompts";
import { TelemetryEvent } from "../../../telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { ChatTelemetryData } from "../../telemetry";
import { showFileTree, matchOfficeAddinProject } from "./helper";
import { localize } from "../../../utils/localizeUtils";
import { Planner } from "../../officeCommon/planner";
import { CommandKey } from "../../../constants";

export default async function officeAddinCreateCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const officeAddinChatTelemetryData = ChatTelemetryData.createByParticipant(
    officeAddinChatParticipantId,
    OfficeAddinChatCommand.Create,
    request.location
  );
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatStart,
    officeAddinChatTelemetryData.properties
  );
  const isHarmful = await isInputHarmful(request, token);
  if (!isHarmful) {
    const matchedResult = await matchOfficeAddinProject(
      request,
      token,
      officeAddinChatTelemetryData
    );
    if (matchedResult) {
      const describeProjectChatMessages = [
        describeOfficeAddinProjectSystemPrompt,
        new LanguageModelChatUserMessage(
          `The project you are looking for is '${JSON.stringify(matchedResult)}'.`
        ),
      ];
      officeAddinChatTelemetryData.chatMessages.push(...describeProjectChatMessages);

      await verbatimCopilotInteraction(
        "copilot-gpt-3.5-turbo",
        describeProjectChatMessages,
        response,
        token
      );
      if (matchedResult.type === "sample") {
        const folder = await showFileTree(matchedResult, response);
        const sampleTitle = localize("teamstoolkit.chatParticipants.create.sample");
        response.button({
          command: CHAT_CREATE_OFFICEADDIN_SAMPLE_COMMAND_ID,
          arguments: [folder],
          title: sampleTitle,
        });
      } else if (matchedResult.type === "template") {
        const templateTitle = localize("teamstoolkit.chatParticipants.create.template");
        response.button({
          command: CHAT_CREATE_OFFICEADDIN_TEMPLATE_COMMAND_ID,
          arguments: [
            CommandKey.Create,
            officeAddinChatTelemetryData.requestId,
            matchedResult.data,
          ],
          title: templateTitle,
        });
      }
    } else {
      // TODO: If the match fails, generate the code.
      return await Planner.getInstance().processRequest(
        new LanguageModelChatUserMessage(request.prompt),
        request,
        response,
        token,
        OfficeAddinChatCommand.Create,
        officeAddinChatTelemetryData
      );
    }
  } else {
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.harmfulInputResponse"));
  }
  officeAddinChatTelemetryData.markComplete();
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChat,
    officeAddinChatTelemetryData.properties,
    officeAddinChatTelemetryData.measurements
  );
  return {
    metadata: {
      command: TeamsChatCommand.Create,
      requestId: officeAddinChatTelemetryData.requestId,
    },
  };
}

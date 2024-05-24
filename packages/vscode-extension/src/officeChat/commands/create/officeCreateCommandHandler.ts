// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatUserMessage,
} from "vscode";

import { OfficeChatCommand, officeChatParticipantId } from "../../consts";
import { verbatimCopilotInteraction } from "../../../chat/utils";
import { isInputHarmful } from "../../utils";
import { ICopilotChatOfficeResult } from "../../types";
import { describeOfficeProjectSystemPrompt } from "../../officePrompts";
import { TelemetryEvent } from "../../../telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { ChatTelemetryData } from "../../../chat/telemetry";
import { matchOfficeProject, showOfficeSampleFileTree, showOfficeTemplateFileTree } from "./helper";
import { localize } from "../../../utils/localizeUtils";
import { Planner } from "../../common/planner";
import { CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID } from "../../consts";

export default async function officeCreateCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatOfficeResult> {
  const officeChatTelemetryData = ChatTelemetryData.createByParticipant(
    officeChatParticipantId,
    OfficeChatCommand.Create,
    request.location
  );
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatStart,
    officeChatTelemetryData.properties
  );

  if (request.prompt.trim() === "") {
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.create.noPromptAnswer"));

    officeChatTelemetryData.markComplete();
    ExtTelemetry.sendTelemetryEvent(
      TelemetryEvent.CopilotChat,
      officeChatTelemetryData.properties,
      officeChatTelemetryData.measurements
    );
    return {
      metadata: {
        command: OfficeChatCommand.Create,
        requestId: officeChatTelemetryData.requestId,
      },
    };
  }

  const isHarmful = await isInputHarmful(request, token);
  if (!isHarmful) {
    const matchedResult = await matchOfficeProject(request, token, officeChatTelemetryData);
    if (matchedResult) {
      response.markdown(
        localize("teamstoolkit.chatParticipants.officeAddIn.create.projectMatched")
      );
      const describeProjectChatMessages = [
        describeOfficeProjectSystemPrompt(),
        new LanguageModelChatUserMessage(
          `The project you are looking for is '${JSON.stringify(matchedResult)}'.`
        ),
      ];
      officeChatTelemetryData.chatMessages.push(...describeProjectChatMessages);

      await verbatimCopilotInteraction(
        "copilot-gpt-3.5-turbo",
        describeProjectChatMessages,
        response,
        token
      );
      if (matchedResult.type === "sample") {
        const folder = await showOfficeSampleFileTree(matchedResult, response);
        const sampleTitle = localize("teamstoolkit.chatParticipants.create.sample");
        response.button({
          command: CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID,
          arguments: [folder],
          title: sampleTitle,
        });
      } else {
        const tmpFolder = await showOfficeTemplateFileTree(matchedResult.data, response);
        const templateTitle = localize("teamstoolkit.chatParticipants.create.template");
        response.button({
          command: CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID,
          arguments: [tmpFolder],
          title: templateTitle,
        });
      }
    } else {
      const chatResult = await Planner.getInstance().processRequest(
        new LanguageModelChatUserMessage(request.prompt),
        request,
        response,
        token,
        OfficeChatCommand.Create,
        officeChatTelemetryData
      );
      officeChatTelemetryData.markComplete();
      ExtTelemetry.sendTelemetryEvent(
        TelemetryEvent.CopilotChat,
        officeChatTelemetryData.properties,
        officeChatTelemetryData.measurements
      );
      return chatResult;
    }
  } else {
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.harmfulInputResponse"));
  }
  officeChatTelemetryData.markComplete();
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChat,
    officeChatTelemetryData.properties,
    officeChatTelemetryData.measurements
  );
  return {
    metadata: {
      command: OfficeChatCommand.Create,
      requestId: officeChatTelemetryData.requestId,
    },
  };
}

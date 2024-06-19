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

import { OfficeChatCommand, officeChatParticipantId } from "../../consts";
import { verbatimCopilotInteraction } from "../../../chat/utils";
import { isInputHarmful } from "../../utils";
import { ICopilotChatOfficeResult } from "../../types";
import { describeOfficeProjectSystemPrompt } from "../../officePrompts";
import { TelemetryEvent } from "../../../telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { matchOfficeProject, showOfficeSampleFileTree, showOfficeTemplateFileTree } from "./helper";
import { localize } from "../../../utils/localizeUtils";
import { Planner } from "../../common/planner";
import { CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID } from "../../consts";
import { OfficeChatTelemetryData } from "../../telemetry";

export default async function officeCreateCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatOfficeResult> {
  const officeChatTelemetryData = OfficeChatTelemetryData.createByParticipant(
    officeChatParticipantId,
    OfficeChatCommand.Create
  );
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatStart,
    officeChatTelemetryData.properties
  );

  if (request.prompt.trim() === "") {
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.create.noPromptAnswer"));
    officeChatTelemetryData.setBlockReason("Empty Input");
    officeChatTelemetryData.markComplete("unsupportedPrompt");
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
  const isHarmful = await isInputHarmful(request, token, officeChatTelemetryData);
  if (!isHarmful) {
    const matchedResult = await matchOfficeProject(request, token, officeChatTelemetryData);
    if (matchedResult) {
      officeChatTelemetryData.setTimeToFirstToken();
      response.markdown(
        localize("teamstoolkit.chatParticipants.officeAddIn.create.projectMatched")
      );
      const describeProjectChatMessages = [
        describeOfficeProjectSystemPrompt(),
        new LanguageModelChatMessage(
          LanguageModelChatMessageRole.User,
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
        const sampleInfos = await showOfficeSampleFileTree(matchedResult, response);
        const folder = sampleInfos[0];
        const hostType = sampleInfos[1].toLowerCase();
        const sampleTitle = localize("teamstoolkit.chatParticipants.create.sample");
        officeChatTelemetryData.setHostType(hostType);
        const matchResultInfo = "sample";
        response.button({
          command: CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID,
          arguments: [folder, officeChatTelemetryData.requestId, matchResultInfo],
          title: sampleTitle,
        });
      } else {
        const tmpHostType = (matchedResult.data as any)["addin-host"].toLowerCase();
        const tmpFolder = await showOfficeTemplateFileTree(matchedResult.data as any, response);
        const templateTitle = localize("teamstoolkit.chatParticipants.create.template");
        officeChatTelemetryData.setHostType(tmpHostType);
        const tmpmatchResultInfo = "template";
        response.button({
          command: CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID,
          arguments: [tmpFolder, officeChatTelemetryData.requestId, tmpmatchResultInfo],
          title: templateTitle,
        });
      }
    } else {
      const chatResult = await Planner.getInstance().processRequest(
        new LanguageModelChatMessage(LanguageModelChatMessageRole.User, request.prompt),
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
    officeChatTelemetryData.setTimeToFirstToken();
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.harmfulInputResponse"));
  }
  if (isHarmful) {
    officeChatTelemetryData.setBlockReason("RAI");
    officeChatTelemetryData.markComplete("unsupportedPrompt");
  } else {
    officeChatTelemetryData.markComplete();
  }
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

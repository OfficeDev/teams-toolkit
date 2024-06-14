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
import { countMessagesTokens, verbatimCopilotInteraction } from "../../../chat/utils";
import { isInputHarmful } from "../../utils";
import { ICopilotChatOfficeResult } from "../../types";
import { describeOfficeProjectSystemPrompt } from "../../officePrompts";
import { TelemetryEvent, TelemetryProperty } from "../../../telemetry/extTelemetryEvents";
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
    OfficeChatCommand.Create
  );
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatStart,
    officeChatTelemetryData.properties
  );

  if (request.prompt.trim() === "") {
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.create.noPromptAnswer"));
    officeChatTelemetryData.properties[TelemetryProperty.CopilotChatBlockReason] = "Empty Input";
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
  officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTotalTokens] = 0;
  officeChatTelemetryData.properties[TelemetryProperty.CopilotChatResponseTokensPerSecond] = "";
  const isHarmful = await isInputHarmful(request, token, officeChatTelemetryData);
  if (!isHarmful) {
    const matchedResult = await matchOfficeProject(request, token, officeChatTelemetryData);
    if (matchedResult) {
      officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTimeToFirstToken] =
        Date.now() - officeChatTelemetryData.startTime;
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
      const t0 = performance.now();
      await verbatimCopilotInteraction(
        "copilot-gpt-3.5-turbo",
        describeProjectChatMessages,
        response,
        token
      );
      const t1 = performance.now();
      const requestTokens = countMessagesTokens(describeProjectChatMessages);
      officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTotalTokens] +=
        requestTokens;
      officeChatTelemetryData.properties[TelemetryProperty.CopilotChatResponseTokensPerSecond] +=
        (requestTokens / ((t1 - t0) / 1000)).toString() + ",";

      if (matchedResult.type === "sample") {
        const sampleInfos = await showOfficeSampleFileTree(matchedResult, response);
        const folder = sampleInfos[0];
        const hostType = sampleInfos[1].toLowerCase();
        const matchResultInfo = "sample";
        const sampleTitle = localize("teamstoolkit.chatParticipants.create.sample");
        officeChatTelemetryData.properties[TelemetryProperty.HostType] = hostType;
        response.button({
          command: CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID,
          arguments: [folder, officeChatTelemetryData.requestId, matchResultInfo],
          title: sampleTitle,
        });
      } else {
        const tmpmatchResultInfo = "template";
        const tmpHostType = (matchedResult.data as any)["addin-host"].toLowerCase();
        const tmpFolder = await showOfficeTemplateFileTree(matchedResult.data as any, response);
        const templateTitle = localize("teamstoolkit.chatParticipants.create.template");
        officeChatTelemetryData.properties[TelemetryProperty.HostType] = tmpHostType;
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
      officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTotalTokensPerSecond] =
        officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTotalTokens] /
        (officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTimeToComplete] / 1000);
      ExtTelemetry.sendTelemetryEvent(
        TelemetryEvent.CopilotChat,
        officeChatTelemetryData.properties,
        officeChatTelemetryData.measurements
      );
      return chatResult;
    }
  } else {
    officeChatTelemetryData.measurements[TelemetryProperty.CopilotChatTimeToFirstToken] =
      Date.now() - officeChatTelemetryData.startTime;
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.harmfulInputResponse"));
    officeChatTelemetryData.properties[TelemetryProperty.CopilotChatBlockReason] = "RAI";
  }
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
      command: OfficeChatCommand.Create,
      requestId: officeChatTelemetryData.requestId,
    },
  };
}

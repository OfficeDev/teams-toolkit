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
import { ICopilotChatOfficeResult, OfficeProjectInfo } from "../../types";
import { describeOfficeProjectSystemPrompt } from "../../officePrompts";
import { TelemetryEvent } from "../../../telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { matchOfficeProject, showOfficeSampleFileTree, showOfficeTemplateFileTree } from "./helper";
import { localize } from "../../../utils/localizeUtils";
import { Planner } from "../../common/planner";
import { CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID } from "../../consts";
import { OfficeChatTelemetryBlockReasonEnum, OfficeChatTelemetryData } from "../../telemetry";

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
    officeChatTelemetryData.setBlockReason(OfficeChatTelemetryBlockReasonEnum.UnsupportedInput);
    officeChatTelemetryData.markComplete("fail");
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
        const sampleInfos: OfficeProjectInfo = await showOfficeSampleFileTree(
          matchedResult,
          response
        );
        const folder = sampleInfos.path;
        const hostType = sampleInfos.host.toLowerCase();
        const sampleTitle = localize("teamstoolkit.chatParticipants.create.sample");
        officeChatTelemetryData.setHostType(hostType);
        response.button({
          command: CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID,
          arguments: [folder, officeChatTelemetryData.requestId, matchedResult.type],
          title: sampleTitle,
        });
      } else {
        const tmpHostType = (matchedResult.data as any)?.["addin-host"].toLowerCase();
        const tmpFolder = await showOfficeTemplateFileTree(matchedResult.data, response);
        const templateTitle = localize("teamstoolkit.chatParticipants.create.template");
        officeChatTelemetryData.setHostType(tmpHostType);
        response.button({
          command: CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID,
          arguments: [tmpFolder, officeChatTelemetryData.requestId, matchedResult.type],
          title: templateTitle,
        });
      }
    } else {
      let chatResult: ICopilotChatOfficeResult = {};
      try {
        chatResult = await Planner.getInstance().processRequest(
          new LanguageModelChatMessage(LanguageModelChatMessageRole.User, request.prompt),
          request,
          response,
          token,
          OfficeChatCommand.Create,
          officeChatTelemetryData
        );
        officeChatTelemetryData.markComplete();
      } catch (error) {
        officeChatTelemetryData.markComplete("fail");
      }
      officeChatTelemetryData.markComplete();
      ExtTelemetry.sendTelemetryEvent(
        TelemetryEvent.CopilotChat,
        officeChatTelemetryData.properties,
        officeChatTelemetryData.measurements
      );
      return chatResult;
    }
    officeChatTelemetryData.markComplete();
  } else {
    officeChatTelemetryData.setTimeToFirstToken();
    response.markdown(localize("teamstoolkit.chatParticipants.officeAddIn.harmfulInputResponse"));
    officeChatTelemetryData.setBlockReason(OfficeChatTelemetryBlockReasonEnum.RAI);
    officeChatTelemetryData.markComplete("fail");
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

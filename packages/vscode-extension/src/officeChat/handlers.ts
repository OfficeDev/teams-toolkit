// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatUserMessage,
  ProviderResult,
} from "vscode";
import { OfficeChatCommand, officeChatParticipantId } from "./consts";
import followupProvider from "../chat/followupProvider";
import { ICopilotChatResult } from "../chat/types";
import { ChatTelemetryData } from "../chat/telemetry";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import officeCreateCommandHandler from "./commands/create/officeCreateCommandHandler";
import generatecodeCommandHandler from "./commands/generatecode/generatecodeCommandHandler";
import officeNextStepCommandHandler from "./commands/nextStep/officeNextstepCommandHandler";
import { defaultOfficeSystemPrompt } from "./officePrompts";
import { verbatimCopilotInteraction } from "../chat/utils";

export function officeChatRequestHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): ProviderResult<ICopilotChatResult> {
  followupProvider.clearFollowups();
  if (request.command == OfficeChatCommand.Create) {
    return officeCreateCommandHandler(request, context, response, token);
  } else if (request.command == OfficeChatCommand.GenerateCode) {
    return generatecodeCommandHandler(request, context, response, token);
  } else if (request.command == OfficeChatCommand.NextStep) {
    return officeNextStepCommandHandler(request, context, response, token);
  } else {
    return officeDefaultHandler(request, context, response, token);
  }
}

async function officeDefaultHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const chatTelemetryData = ChatTelemetryData.createByParticipant(
    officeChatParticipantId,
    "",
    request.location
  );
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CopilotChatStart, chatTelemetryData.properties);
  const messages = [defaultOfficeSystemPrompt(), new LanguageModelChatUserMessage(request.prompt)];
  chatTelemetryData.chatMessages.push(...messages);
  await verbatimCopilotInteraction("copilot-gpt-4", messages, response, token);

  chatTelemetryData.markComplete();
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChat,
    chatTelemetryData.properties,
    chatTelemetryData.measurements
  );
  return { metadata: { command: undefined, requestId: chatTelemetryData.requestId } };
}

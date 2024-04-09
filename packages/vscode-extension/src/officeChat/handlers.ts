// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  commands,
  LanguageModelChatUserMessage,
  ProviderResult,
  Uri,
  window,
  workspace,
} from "vscode";
import * as fs from "fs-extra";
import * as path from "path";
import * as uuid from "uuid";
import { OfficeChatCommand, officeChatParticipantId } from "./consts";
import followupProvider from "../chat/followupProvider";
import { ICopilotChatResult } from "../chat/types";
import { ChatTelemetryData } from "../chat/telemetry";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryTriggerFrom,
  TelemetryEvent,
  TelemetryProperty,
} from "../telemetry/extTelemetryEvents";
import { localize } from "../utils/localizeUtils";
import officeCreateCommandHandler from "./commands/create/officeCreateCommandHandler";
import generatecodeCommandHandler from "./commands/generatecode/generatecodeCommandHandler";
import officeNextStepCommandHandler from "./commands/nextStep/officeNextstepCommandHandler";
import { defaultOfficeSystemPrompt } from "./officePrompts";
import { verbatimCopilotInteraction } from "../chat/utils";
import { FxError, Result } from "@microsoft/teamsfx-api";

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

export async function chatCreateOfficeTemplateCommandHandler(
  command: string,
  requestId: string,
  data: any
) {
  const officeChatTelemetryData = ChatTelemetryData.get(requestId);
  const correlationId = uuid.v4();
  if (officeChatTelemetryData) {
    ExtTelemetry.sendTelemetryEvent(
      TelemetryEvent.CopilotChatClickButton,
      {
        ...officeChatTelemetryData.properties,
        [TelemetryProperty.CopilotChatRunCommandId]: OfficeChatCommand.Create,
        [TelemetryProperty.CorrelationId]: correlationId,
      },
      officeChatTelemetryData.measurements
    );
  }
  const customFolder = await window.showOpenDialog({
    title: localize("teamstoolkit.chatParticipants.create.selectFolder.title"),
    openLabel: localize("teamstoolkit.chatParticipants.create.selectFolder.label"),
    defaultUri: Uri.file(workspace.workspaceFolders![0].uri.fsPath),
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
  });
  if (!customFolder) {
    return;
  } else {
    const dstPath = customFolder[0].fsPath;
    const baseName: string = data.name;
    let projectName = baseName;
    let index = 0;
    while (fs.existsSync(path.join(dstPath, projectName))) {
      projectName = `${baseName} ${++index}`;
    }
    const inputs = {
      ...data,
      "programming-language": "typescript",
      folder: dstPath,
      "app-name": projectName,
    };
    return await commands.executeCommand<Result<unknown, FxError>>(
      command,
      correlationId,
      TelemetryTriggerFrom.CopilotChat,
      inputs
    );
  }
}

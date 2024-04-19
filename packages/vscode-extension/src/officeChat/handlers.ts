// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatUserMessage,
  ProviderResult,
  Uri,
  commands,
  window,
  workspace,
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
import { localize } from "../utils/localizeUtils";

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

export async function chatCreateOfficeProjectCommandHandler(folder: string) {
  // Let user choose the project folder
  let dstPath = "";
  let folderChoice: string | undefined = undefined;
  if (workspace.workspaceFolders !== undefined && workspace.workspaceFolders.length > 0) {
    folderChoice = await window.showQuickPick([
      localize("teamstoolkit.chatParticipants.officeAddIn.create.quickPick.workspace"),
      localize("teamstoolkit.qm.browse"),
    ]);
    if (!folderChoice) {
      return;
    }
    if (
      folderChoice ===
      localize("teamstoolkit.chatParticipants.officeAddIn.create.quickPick.workspace")
    ) {
      dstPath = workspace.workspaceFolders[0].uri.fsPath;
    }
  }
  if (dstPath === "") {
    const customFolder = await window.showOpenDialog({
      title: localize("teamstoolkit.chatParticipants.officeAddIn.create.selectFolder.title"),
      openLabel: localize("teamstoolkit.chatParticipants.officeAddIn.create.selectFolder.label"),
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
    });
    if (!customFolder) {
      return;
    }
    dstPath = customFolder[0].fsPath;
  }
  try {
    await fs.copy(folder, dstPath);
    if (
      folderChoice !==
      localize("teamstoolkit.chatParticipants.officeAddIn.create.quickPick.workspace")
    ) {
      void commands.executeCommand("vscode.openFolder", Uri.file(dstPath));
    } else {
      void window.showInformationMessage(
        localize("teamstoolkit.chatParticipants.officeAddIn.create.successfullyCreated")
      );
      void commands.executeCommand("workbench.view.extension.teamsfx");
    }
  } catch (error) {
    console.error("Error copying files:", error);
    void window.showErrorMessage(
      localize("teamstoolkit.chatParticipants.officeAddIn.create.failToCreate")
    );
  }
}

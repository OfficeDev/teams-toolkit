// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  ChatResultFeedback,
  LanguageModelChatMessage,
  LanguageModelChatMessageRole,
  ProviderResult,
  Uri,
  commands,
  window,
  workspace,
} from "vscode";
import { OfficeChatCommand, officeChatParticipantId } from "./consts";
import { Correlator } from "@microsoft/teamsfx-core";
import followupProvider from "../chat/followupProvider";
import { ChatTelemetryData } from "../chat/telemetry";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../telemetry/extTelemetryEvents";
import officeCreateCommandHandler from "./commands/create/officeCreateCommandHandler";
import generatecodeCommandHandler from "./commands/generatecode/generatecodeCommandHandler";
import officeNextStepCommandHandler from "./commands/nextStep/officeNextstepCommandHandler";
import { defaultOfficeSystemPrompt } from "./officePrompts";
import { verbatimCopilotInteraction } from "../chat/utils";
import { localize } from "../utils/localizeUtils";
import { ICopilotChatOfficeResult } from "./types";
import { ITelemetryData } from "../chat/types";

export function officeChatRequestHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): ProviderResult<ICopilotChatOfficeResult> {
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
): Promise<ICopilotChatOfficeResult> {
  const officeChatTelemetryData = ChatTelemetryData.createByParticipant(
    officeChatParticipantId,
    ""
  );
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatStart,
    officeChatTelemetryData.properties
  );

  if (!request.prompt) {
    throw new Error(`
Please specify a question when using this command.

Usage: @office Ask questions about Office Add-ins development.`);
  }
  const messages = [
    defaultOfficeSystemPrompt(),
    new LanguageModelChatMessage(LanguageModelChatMessageRole.User, request.prompt),
  ];
  officeChatTelemetryData.chatMessages.push(...messages);
  await verbatimCopilotInteraction("copilot-gpt-4", messages, response, token);

  officeChatTelemetryData.markComplete();
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChat,
    officeChatTelemetryData.properties,
    officeChatTelemetryData.measurements
  );
  return { metadata: { command: undefined, requestId: officeChatTelemetryData.requestId } };
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

export function handleOfficeFeedback(e: ChatResultFeedback): void {
  const result = e.result as ICopilotChatOfficeResult;
  const telemetryData: ITelemetryData = {
    properties: {
      [TelemetryProperty.CopilotChatRequestId]: result.metadata?.requestId ?? "",
      [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CopilotChat,
      [TelemetryProperty.CopilotChatCommand]: result.metadata?.command ?? "",
      [TelemetryProperty.CorrelationId]: Correlator.getId(),
    },
    measurements: {
      [TelemetryProperty.CopilotChatFeedbackHelpful]: e.kind,
    },
  };

  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatFeedback,
    telemetryData.properties,
    telemetryData.measurements
  );
}

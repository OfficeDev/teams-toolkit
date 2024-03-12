// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  ChatResult,
  commands,
  env,
  LanguageModelChatUserMessage,
  ProviderResult,
  Uri,
  window,
  workspace,
} from "vscode";

import { downloadDirectory } from "@microsoft/teamsfx-core/build/component/generator/utils";

import createCommandHandler from "./commands/create/createCommandHandler";
import { ProjectMetadata } from "./commands/create/types";
import nextStepCommandHandler from "./commands/nextstep/nextstepCommandHandler";
import { TeamsChatCommand } from "./consts";
import followupProvider from "./followupProvider";
import { defaultSystemPrompt } from "./prompts";
import { getSampleDownloadUrlInfo, verbatimCopilotInteraction } from "./utils";
import { localize } from "../utils/localizeUtils";

export function chatRequestHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): ProviderResult<ChatResult> {
  // Matching chat commands in the package.json
  followupProvider.clearFollowups();
  if (request.command == TeamsChatCommand.Create) {
    return createCommandHandler(request, context, response, token);
  } else if (request.command == TeamsChatCommand.NextStep) {
    return nextStepCommandHandler(request, context, response, token);
  } else {
    return defaultHandler(request, context, response, token);
  }
  return {};
}

async function defaultHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<null> {
  const messages = [defaultSystemPrompt, new LanguageModelChatUserMessage(request.prompt)];
  await verbatimCopilotInteraction("copilot-gpt-4", messages, response, token);
  return null;
}

export async function chatCreateCommandHandler(folderOrSample: string | ProjectMetadata) {
  // Let user choose the project folder
  let dstPath = "";
  let folderChoice: string | undefined = undefined;
  if (workspace.workspaceFolders !== undefined && workspace.workspaceFolders.length > 0) {
    folderChoice = await window.showQuickPick([
      localize("teamstoolkit.chatParticipants.create.quickPick.workspace"),
      localize("teamstoolkit.chatParticipants.create.quickPick.browse"),
    ]);
    if (!folderChoice) {
      return;
    }
    if (folderChoice === localize("teamstoolkit.chatParticipants.create.quickPick.workspace")) {
      dstPath = workspace.workspaceFolders[0].uri.fsPath;
    }
  }
  if (dstPath === "") {
    const customFolder = await window.showOpenDialog({
      title: localize("teamstoolkit.chatParticipants.create.selectFolder.title"),
      openLabel: localize("teamstoolkit.chatParticipants.create.selectFolder.label"),
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
    if (typeof folderOrSample === "string") {
      await fs.copy(folderOrSample, dstPath);
    } else {
      const downloadUrlInfo = await getSampleDownloadUrlInfo(folderOrSample.id);
      await downloadDirectory(downloadUrlInfo, dstPath, 2, 20);
    }
    if (folderChoice !== localize("teamstoolkit.chatParticipants.create.quickPick.workspace")) {
      void commands.executeCommand("vscode.openFolder", Uri.file(dstPath));
    } else {
      void window.showInformationMessage(
        localize("teamstoolkit.chatParticipants.create.successfullyCreated")
      );
      void commands.executeCommand("workbench.view.extension.teamsfx");
    }
  } catch (error) {
    console.error("Error copying files:", error);
    void window.showErrorMessage(localize("teamstoolkit.chatParticipants.create.failToCreate"));
  }
}

export async function openUrlCommandHandler(url: string) {
  await env.openExternal(Uri.parse(url));
}

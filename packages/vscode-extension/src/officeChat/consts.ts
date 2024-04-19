// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const officeChatParticipantId = "ms-teams-vscode-extension.office";
export const CHAT_CREATE_OFFICE_PROJECT_COMMAND_ID = "fx-extension.chat.createOfficeProject";

export const enum OfficeChatCommand {
  Create = "create",
  GenerateCode = "generatecode",
  NextStep = "nextstep",
  Help = "help",
}

export function getTokenLimitation(model: "copilot-gpt-3.5-turbo" | "copilot-gpt-4"): number {
  if (model === "copilot-gpt-3.5-turbo") {
    return 3990;
  } else if (model === "copilot-gpt-4") {
    // This is strange for gt4, the limit is less than 4k
    return 3990;
  }

  return 3900;
}

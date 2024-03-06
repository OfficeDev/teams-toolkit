// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ChatFollowup } from "vscode";

export const chatParticipantName = "teams";

export const CHAT_CREATE_SAMPLE_COMMAND_ID = "fx-extension.chat.createSample";
export const CHAT_EXECUTE_COMMAND_ID = "fx-extension.chat.executeCommand";
export const CHAT_OPENURL_COMMAND_ID = "fx-extension.chat.openUrlCommand";

export const enum TeamsChatCommand {
  Create = "create",
  NextStep = "nextstep",
  Help = "help",
}

export const DefaultNextStep: ChatFollowup = {
  prompt: "",
  command: "nextstep",
  label: "What's next I could do?",
};

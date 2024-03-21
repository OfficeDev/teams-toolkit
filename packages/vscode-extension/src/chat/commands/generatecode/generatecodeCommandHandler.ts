// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ChatRequest,
  ChatContext,
  ChatResponseStream,
  CancellationToken,
  LanguageModelChatUserMessage,
} from "vscode";
import { getCopilotResponseAsString } from "../../utils";
import { defaultSystemPrompt } from "../../prompts";
import { OfficeAddinChatCommand } from "../../consts";
import { ICopilotChatResult } from "../../types";
import { Correlator } from "@microsoft/teamsfx-core";

// TODO: Implement the function.
export default async function generatecodeCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const messages = [defaultSystemPrompt(), new LanguageModelChatUserMessage(request.prompt)];
  await getCopilotResponseAsString("copilot-gpt-3.5-turbo", messages, token);
  return {
    metadata: {
      command: OfficeAddinChatCommand.NextStep,
      correlationId: Correlator.getId(),
    },
  };
}

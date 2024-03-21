// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatUserMessage,
} from "vscode";

import { Correlator } from "@microsoft/teamsfx-core";

import { OfficeAddinChatCommand } from "../../consts";
import { defaultSystemPrompt } from "../../prompts";
import { getCopilotResponseAsString } from "../../utils";
import { ICopilotChatResult, ITelemetryMetadata } from "../../types";

// TODO: Implement the function.
export default async function officeAddinCreateCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const messages = [defaultSystemPrompt(), new LanguageModelChatUserMessage(request.prompt)];
  await getCopilotResponseAsString("copilot-gpt-3.5-turbo", messages, token);
  return {
    metadata: {
      command: OfficeAddinChatCommand.Create,
      correlationId: Correlator.getId(),
    },
  };
}

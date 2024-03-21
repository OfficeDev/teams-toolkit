// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ChatRequest,
  ChatContext,
  ChatResponseStream,
  CancellationToken,
  ChatResult,
  ChatFollowup,
  LanguageModelChatUserMessage,
  workspace,
  commands,
} from "vscode";
import { ICopilotChatResult, ITelemetryMetadata } from "../../types";
import { OfficeAddinChatCommand } from "../../consts";
import { Correlator } from "@microsoft/teamsfx-core";
import { TelemetryMetadata } from "../../telemetryData";
import { getCopilotResponseAsString } from "../../utils";
import { defaultSystemPrompt } from "../../prompts";

//TODO: Implement the function.
export default async function officeAddinNextStepCommandHandler(
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

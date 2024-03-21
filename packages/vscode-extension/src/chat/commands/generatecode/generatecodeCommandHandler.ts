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
import { getTeamsApps, getCopilotResponseAsString } from "../../utils";
import { defaultSystemPrompt, describeScenarioSystemPrompt } from "../../prompts";
import { OfficeAddinChatCommand, TeamsChatCommand } from "../../consts";
import followupProvider from "../../followupProvider";
import { TelemetryMetadata } from "../../telemetryData";
import { ICopilotChatResult, ITelemetryMetadata } from "../../types";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../../telemetry/extTelemetryEvents";
import { Correlator, getUuid } from "@microsoft/teamsfx-core";
import { localize } from "../../../utils/localizeUtils";

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

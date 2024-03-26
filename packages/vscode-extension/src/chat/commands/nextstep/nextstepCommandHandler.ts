// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core";
import {
  CancellationToken,
  ChatContext,
  ChatFollowup,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatUserMessage,
  commands,
} from "vscode";
import { workspaceUri } from "../../../globalVariables";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryTriggerFrom } from "../../../telemetry/extTelemetryEvents";
import { TeamsChatCommand } from "../../consts";
import followupProvider from "../../followupProvider";
import { describeScenarioSystemPrompt } from "../../prompts";
import { ChatTelemetryData } from "../../telemetry";
import { IChatTelemetryData, ICopilotChatResult } from "../../types";
import { getCopilotResponseAsString } from "../../utils";
import { getWholeStatus } from "./status";
import { allSteps } from "./steps";
import { NextStep, WholeStatus } from "./types";

export default async function nextStepCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const chatTelemetryData = ChatTelemetryData.createByCommand(TeamsChatCommand.NextStep);
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CopilotChatStart, chatTelemetryData.properties);

  // get all Teams apps under workspace
  const workspace = workspaceUri?.fsPath;
  const teamsApp = isValidProject(workspace) ? workspace : undefined;
  const status: WholeStatus = await getWholeStatus(teamsApp);
  const steps = allSteps()
    .filter((s) => s.condition(status))
    .sort((a, b) => a.priority - b.priority);
  if (steps.length > 1) {
    response.markdown("Here are the next steps you can do:\n");
  }
  for (let index = 0; index < Math.min(3, steps.length); index++) {
    const s = steps[index];
    if (s.description instanceof Function) {
      s.description = s.description(status);
    }
    const stepDescription = await describeStep(s, token, chatTelemetryData);
    const title = s.docLink ? `[${s.title}](${s.docLink})` : s.title;
    if (steps.length > 1) {
      response.markdown(`${index + 1}. ${title}: ${stepDescription}\n`);
    } else {
      response.markdown(`${title}: ${stepDescription}\n`);
    }
    s.commands.forEach((c) => {
      response.button(c);
    });
  }
  const followUps: ChatFollowup[] = [];
  steps.forEach((s) => {
    followUps.push(...s.followUps);
  });
  followupProvider.addFollowups(followUps);

  chatTelemetryData.markComplete();
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChat,
    chatTelemetryData.properties,
    chatTelemetryData.measurements
  );

  return {
    metadata: {
      command: TeamsChatCommand.NextStep,
      requestId: chatTelemetryData.requestId,
    },
  };
}

async function describeStep(
  step: NextStep,
  token: CancellationToken,
  telemetryMetadata: IChatTelemetryData
): Promise<string> {
  const messages = [
    describeScenarioSystemPrompt,
    new LanguageModelChatUserMessage(
      `The scenario you are looking for is '${JSON.stringify({
        description: step.description as string,
      })}'.`
    ),
  ];

  telemetryMetadata.chatMessages.push(...messages);
  return await getCopilotResponseAsString("copilot-gpt-3.5-turbo", messages, token);
}

export async function chatExecuteCommandHandler(
  command: string,
  ...args: unknown[]
): Promise<Result<unknown, FxError>> {
  /// TODO: add response id
  const result = await commands.executeCommand<Result<unknown, FxError>>(
    command,
    TelemetryTriggerFrom.CopilotChat,
    ...args
  );
  return result;
}

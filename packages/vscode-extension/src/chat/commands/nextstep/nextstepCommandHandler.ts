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
import { getWholeStatus, setProjectStatus } from "./status";
import { AllSteps } from "./steps";
import { NextStep, WholeStatus } from "./types";
import { getTeamsApps, getCopilotResponseAsString } from "../../utils";
import { describeScenarioSystemPrompt } from "../../prompts";
import { TeamsChatCommand } from "../../consts";
import followupProvider from "../../followupProvider";
import { TelemetryMetadata } from "../../telemetryData";
import { ISharedTelemetryProperty, ITelemetryMetadata } from "../../types";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../../telemetry/extTelemetryEvents";
import { getUuid } from "@microsoft/teamsfx-core";
import { localize } from "../../../utils/localizeUtils";

let teamsApp: string | undefined = undefined;
let projectId: string | undefined = undefined;

export default async function nextStepCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ChatResult> {
  // Telemetry
  const sharedTelemetryProperty: ISharedTelemetryProperty = {
    [TelemetryProperty.CorrelationId]: getUuid(),
    [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CopilotChat,
  };
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CopilotChatNextStepStart, {
    ...sharedTelemetryProperty,
  });
  const telemetryMetadata: ITelemetryMetadata = new TelemetryMetadata(Date.now());

  // get all Teams apps under workspace
  const teamsApps = getTeamsApps(workspace.workspaceFolders);
  teamsApp = (teamsApps ?? [])[0];
  const status: WholeStatus = await getWholeStatus(teamsApp);
  projectId = status.projectOpened?.projectId;
  const steps = AllSteps.filter((s) => s.condition(status)).sort((a, b) => a.priority - b.priority);
  if (steps.length > 1) {
    response.markdown("Here are the next steps you can do:\n");
  }
  for (let index = 0; index < Math.min(3, steps.length); index++) {
    const s = steps[index];
    if (s.description instanceof Function) {
      s.description = s.description(status);
    }
    const stepDescription = await describeStep(s, token, telemetryMetadata);
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

  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatNextStep,
    { ...sharedTelemetryProperty },
    {
      [TelemetryProperty.CopilotChatTokenCount]: telemetryMetadata.chatMessagesTokenCount(),
      [TelemetryProperty.CopilotChatTimeToComplete]: Date.now() - telemetryMetadata.startTime,
    }
  );
  return {
    metadata: {
      command: TeamsChatCommand.NextStep,
      sharedTelemetryProperty: sharedTelemetryProperty,
    },
  };
}

async function describeStep(
  step: NextStep,
  token: CancellationToken,
  telemetryMetadata: ITelemetryMetadata
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

export async function chatExecuteCommandHandler(command: string, ...args: any[]) {
  const p = projectId ?? teamsApp;
  const needRecord = !!p && command.startsWith("fx-extension.");
  let c = command.replace("fx-extension.", "").trim();
  if (c.toLocaleLowerCase().includes("debug")) {
    c = "debug";
  }
  try {
    await commands.executeCommand(command, ...args);
    // TODO: redefine this part when merging to TTK
    if (needRecord) {
      await setProjectStatus(p!, c, {
        result: "success",
        time: new Date(),
      });
    }
  } catch (e) {
    if (needRecord) {
      await setProjectStatus(p!, c, {
        result: "fail",
        time: new Date(),
      });
    }
    return e;
  }
  return undefined;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { isValidOfficeAddInProject } from "@microsoft/teamsfx-core";
import {
  CancellationToken,
  ChatContext,
  ChatFollowup,
  ChatRequest,
  ChatResponseStream,
} from "vscode";
import { workspaceUri } from "../../../globalVariables";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { TelemetryEvent } from "../../../telemetry/extTelemetryEvents";
import { CHAT_EXECUTE_COMMAND_ID } from "../../../chat/consts";
import { OfficeChatCommand, officeChatParticipantId } from "../../consts";
import followupProvider from "../../../chat/followupProvider";
import { ChatTelemetryData } from "../../../chat/telemetry";
import { ICopilotChatResult } from "../../../chat/types";
import { describeStep } from "../../../chat/commands/nextstep/nextstepCommandHandler";
import { officeSteps } from "./officeSteps";
import { WholeStatus } from "../../../chat/commands/nextstep/types";
import { getWholeStatus } from "./status";

export default async function officeNextStepCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const officeChatTelemetryData = ChatTelemetryData.createByParticipant(
    officeChatParticipantId,
    OfficeChatCommand.NextStep,
    request.location
  );
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatStart,
    officeChatTelemetryData.properties
  );

  if (request.prompt) {
    response.markdown(`
This command provides guidance on your next steps based on your workspace.

E.g. If you're unsure what to do after creating a project, simply ask Copilot by using @office /nextstep.`);
    officeChatTelemetryData.markComplete("unsupportedPrompt");
    ExtTelemetry.sendTelemetryEvent(
      TelemetryEvent.CopilotChat,
      officeChatTelemetryData.properties,
      officeChatTelemetryData.measurements
    );
    return {
      metadata: {
        command: OfficeChatCommand.NextStep,
        requestId: officeChatTelemetryData.requestId,
      },
    };
  }

  const workspace = workspaceUri?.fsPath;
  const officeAddInApp = isValidOfficeAddInProject(workspace) ? workspace : undefined;
  const status: WholeStatus = await getWholeStatus(officeAddInApp);
  const steps = officeSteps()
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
    const stepDescription = await describeStep(s, token, officeChatTelemetryData);
    const title = s.docLink ? `[${s.title}](${s.docLink})` : s.title;
    if (steps.length > 1) {
      response.markdown(`${index + 1}. ${title}: ${stepDescription}\n`);
    } else {
      response.markdown(`${title}: ${stepDescription}\n`);
    }
    s.commands.forEach((c) => {
      if (c.command === CHAT_EXECUTE_COMMAND_ID) {
        c.arguments!.splice(1, 0, officeChatTelemetryData.requestId);
      }
      response.button(c);
    });
  }
  const followUps: ChatFollowup[] = [];
  steps.forEach((s) => {
    followUps.push(...s.followUps);
  });
  followupProvider.addFollowups(followUps);

  officeChatTelemetryData.markComplete();
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChat,
    officeChatTelemetryData.properties,
    officeChatTelemetryData.measurements
  );

  return {
    metadata: {
      command: OfficeChatCommand.NextStep,
      requestId: officeChatTelemetryData.requestId,
    },
  };
}

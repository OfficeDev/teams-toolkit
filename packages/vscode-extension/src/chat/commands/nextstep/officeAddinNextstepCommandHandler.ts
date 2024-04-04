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
import {
  CHAT_EXECUTE_COMMAND_ID,
  OfficeAddinChatCommand,
  officeAddinChatParticipantId,
} from "../../consts";
import followupProvider from "../../followupProvider";
import { ChatTelemetryData } from "../../telemetry";
import { ICopilotChatResult } from "../../types";
import { describeStep } from "./nextstepCommandHandler";
import { officeAddinSteps } from "./officeAddinSteps";
import { getWholeStatus } from "./status";
import { WholeStatus } from "./types";

export default async function officeAddinNextStepCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const officeAddinChatTelemetryData = ChatTelemetryData.createByParticipant(
    officeAddinChatParticipantId,
    OfficeAddinChatCommand.NextStep,
    request.location
  );
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChatStart,
    officeAddinChatTelemetryData.properties
  );

  if (request.prompt) {
    response.markdown(`
This command provides guidance on your next steps based on your workspace.

E.g. If you're unsure what to do after creating a project, simply ask Copilot by using @office/nextstep.`);
    officeAddinChatTelemetryData.markComplete("unsupportedPrompt");
    ExtTelemetry.sendTelemetryEvent(
      TelemetryEvent.CopilotChat,
      officeAddinChatTelemetryData.properties,
      officeAddinChatTelemetryData.measurements
    );
    return {
      metadata: {
        command: OfficeAddinChatCommand.NextStep,
        requestId: officeAddinChatTelemetryData.requestId,
      },
    };
  }

  const workspace = workspaceUri?.fsPath;
  const officeAddInApp = isValidOfficeAddInProject(workspace) ? workspace : undefined;
  const status: WholeStatus = await getWholeStatus(officeAddInApp);
  const steps = officeAddinSteps()
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
    const stepDescription = await describeStep(s, token, officeAddinChatTelemetryData);
    const title = s.docLink ? `[${s.title}](${s.docLink})` : s.title;
    if (steps.length > 1) {
      response.markdown(`${index + 1}. ${title}: ${stepDescription}\n`);
    } else {
      response.markdown(`${title}: ${stepDescription}\n`);
    }
    s.commands.forEach((c) => {
      if (c.command === CHAT_EXECUTE_COMMAND_ID) {
        c.arguments!.splice(1, 0, officeAddinChatTelemetryData.requestId);
      }
      response.button(c);
    });
  }
  const followUps: ChatFollowup[] = [];
  steps.forEach((s) => {
    followUps.push(...s.followUps);
  });
  followupProvider.addFollowups(followUps);

  officeAddinChatTelemetryData.markComplete();
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChat,
    officeAddinChatTelemetryData.properties,
    officeAddinChatTelemetryData.measurements
  );

  return {
    metadata: {
      command: OfficeAddinChatCommand.NextStep,
      requestId: officeAddinChatTelemetryData.requestId,
    },
  };
}

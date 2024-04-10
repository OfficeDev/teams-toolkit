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
import {
  describeStep,
  generateResponse,
} from "../../../chat/commands/nextstep/nextstepCommandHandler";
import { officeSteps } from "./officeSteps";
import { getWholeStatus } from "../../../chat/commands/nextstep/status";
import { WholeStatus } from "../../../chat/commands/nextstep/types";

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
  await generateResponse(steps, status, response, token, officeChatTelemetryData);

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

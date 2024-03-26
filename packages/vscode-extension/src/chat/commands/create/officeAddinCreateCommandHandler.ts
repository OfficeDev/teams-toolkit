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
import { IChatTelemetryData, ICopilotChatResult } from "../../types";
import { ProjectMetadata } from "./types";
import { sampleProvider } from "@microsoft/teamsfx-core";
import { getOfficeAddinProjectMatchSystemPrompt } from "../../officeAddinPrompts";
import {
  TelemetryTriggerFrom,
  TelemetryEvent,
  TelemetryProperty,
} from "../../../telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { ChatTelemetryData } from "../../telemetry";
import { showFileTree } from "./createCommandHandler";
import { localize } from "../../../utils/localizeUtils";
import { CHAT_CREATE_OFFICEADDIN_SAMPLE_COMMAND_ID, TeamsChatCommand } from "../../consts";
import * as officeAddinTemplateMeatdata from "./officeAddinTemplateMetadata.json";

export default async function officeAddinCreateCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const chatTelemetryData = ChatTelemetryData.createByCommand(TeamsChatCommand.Create);
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CopilotChatStart, chatTelemetryData.properties);

  const matchedResult = await matchOfficeAddinProject(request, token, chatTelemetryData);
  if (matchedResult) {
    const folder = await showFileTree(matchedResult, response);
    const sampleTitle = localize("teamstoolkit.chatParticipants.create.sample");
    response.button({
      command: CHAT_CREATE_OFFICEADDIN_SAMPLE_COMMAND_ID,
      arguments: [folder],
      title: sampleTitle,
    });
  } else {
    // TODO: If the match fails, generate the code.
  }

  const messages = [defaultSystemPrompt(), new LanguageModelChatUserMessage(request.prompt)];
  await getCopilotResponseAsString("copilot-gpt-3.5-turbo", messages, token);
  return {
    metadata: {
      command: TeamsChatCommand.Create,
      requestId: chatTelemetryData.requestId,
    },
  };
}

async function matchOfficeAddinProject(
  request: ChatRequest,
  token: CancellationToken,
  telemetryMetadata: IChatTelemetryData
): Promise<ProjectMetadata | undefined> {
  const allOfficeAddinProjectMetadata = [
    ...getOfficeAddinTemplateMetadata(),
    ...(await getOfficeAddinSampleMetadata()),
  ];
  const messages = [
    getOfficeAddinProjectMatchSystemPrompt(allOfficeAddinProjectMetadata), // TODO: Implement the getOfficeAddinProjectMatchSystemPrompt.
    new LanguageModelChatUserMessage(request.prompt),
  ];
  const response = await getCopilotResponseAsString("copilot-gpt-3.5-turbo", messages, token);
  let matchedProjectId: string;
  if (response) {
    try {
      const responseJson = JSON.parse(response);
      if (responseJson && responseJson.app) {
        matchedProjectId = responseJson.app;
      }
    } catch (e) {}
  }
  let result: ProjectMetadata | undefined;
  const matchedProject = allOfficeAddinProjectMetadata.find(
    (config) => config.id === matchedProjectId
  );
  if (matchedProject) {
    result = matchedProject;
  }
  return result;
}

async function getOfficeAddinSampleMetadata(): Promise<ProjectMetadata[]> {
  const sampleCollection = await sampleProvider.SampleCollection;
  const result: ProjectMetadata[] = [];
  for (const sample of sampleCollection.samples) {
    if (
      sample.types.includes("Word") ||
      sample.types.includes("Excel") ||
      sample.types.includes("Powerpoint")
    ) {
      result.push({
        id: sample.id,
        type: "sample",
        platform: "WXP",
        name: sample.title,
        description: sample.fullDescription,
      });
    }
  }
  return result;
}

function getOfficeAddinTemplateMetadata(): ProjectMetadata[] {
  return officeAddinTemplateMeatdata.map((config) => {
    return {
      id: config.id,
      type: "template",
      platform: "WXP",
      name: config.name,
      description: config.description,
      data: {
        capabilities: config["capabilities"],
        "project-type": config["project-type"],
        "addin-office-capability": config["addin-office-capability"],
      },
    };
  });
}

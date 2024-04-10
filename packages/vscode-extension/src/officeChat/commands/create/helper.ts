// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as officeTemplateMeatdata from "./officeTemplateMetadata.json";
import { ChatRequest, CancellationToken, LanguageModelChatUserMessage } from "vscode";
import { IChatTelemetryData } from "../../../chat/types";
import { ProjectMetadata } from "../../../chat/commands/create/types";
import { getCopilotResponseAsString } from "../../../chat/utils";
import { BM25, BMDocument, DocumentWithmetadata } from "../../retrievalUtil/BM25";
import { prepareDiscription } from "../../retrievalUtil/retrievalUtil";
import { getOfficeProjectMatchSystemPrompt } from "../../officePrompts";
import { sampleProvider } from "@microsoft/teamsfx-core";

export async function matchOfficeProject(
  request: ChatRequest,
  token: CancellationToken,
  telemetryMetadata: IChatTelemetryData
): Promise<ProjectMetadata | undefined> {
  const allOfficeProjectMetadata = [
    ...getOfficeTemplateMetadata(),
    ...(await getOfficeSampleMetadata()),
  ];
  const messages = [
    getOfficeProjectMatchSystemPrompt(allOfficeProjectMetadata),
    new LanguageModelChatUserMessage(request.prompt),
  ];
  telemetryMetadata.chatMessages.push(...messages);
  const response = await getCopilotResponseAsString("copilot-gpt-4", messages, token);
  let matchedProjectId: string;
  if (response) {
    try {
      const responseJson = JSON.parse(response);
      if (responseJson && responseJson.addin) {
        matchedProjectId = responseJson.addin;
      }
    } catch (e) {}
  }
  let result: ProjectMetadata | undefined;
  const matchedProject = allOfficeProjectMetadata.find((config) => config.id === matchedProjectId);
  if (matchedProject) {
    result = matchedProject;
  }
  return result;
}

export async function getOfficeSampleMetadata(): Promise<ProjectMetadata[]> {
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

export function getOfficeTemplateMetadata(): ProjectMetadata[] {
  return officeTemplateMeatdata.map((config) => {
    return {
      id: config.id,
      type: "template",
      platform: "WXP",
      name: config.name,
      description: config.description,
      data: {
        capabilities: config.id,
        "project-type": config["project-type"],
        "addin-host": config["addin-host"],
        agent: "office",
        name: config.name,
      },
    };
  });
}

export async function matchOfficeProjectByBM25(
  request: ChatRequest
): Promise<ProjectMetadata | undefined> {
  const allOfficeProjectMetadata = [
    ...getOfficeTemplateMetadata(),
    ...(await getOfficeSampleMetadata()),
  ];
  const documents: DocumentWithmetadata[] = allOfficeProjectMetadata.map((sample) => {
    return {
      documentText: prepareDiscription(sample.description.toLowerCase()).join(" "),
      metadata: sample,
    };
  });

  const bm25 = new BM25(documents);
  const query = prepareDiscription(request.prompt.toLowerCase());

  // at most match one sample or template
  const matchedDocuments: BMDocument[] = bm25.search(query, 3);

  // adjust score when more samples added
  if (matchedDocuments.length === 1 && matchedDocuments[0].score > 1) {
    return matchedDocuments[0].document.metadata as ProjectMetadata;
  }

  return undefined;
}

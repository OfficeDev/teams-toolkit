// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatResponseStream,
  LanguageModelChatMessage,
  WorkspaceFolder,
  lm,
} from "vscode";

import { isValidProjectV3, sampleProvider } from "@microsoft/teamsfx-core";

export async function verbatimCopilotInteraction(
  model: "copilot-gpt-3.5-turbo" | "copilot-gpt-4",
  messages: LanguageModelChatMessage[],
  response: ChatResponseStream,
  token: CancellationToken
) {
  const chatRequest = await lm.sendChatRequest(model, messages, {}, token);
  for await (const fragment of chatRequest.stream) {
    response.markdown(fragment);
  }
}

export async function getCopilotResponseAsString(
  model: "copilot-gpt-3.5-turbo" | "copilot-gpt-4",
  messages: LanguageModelChatMessage[],
  token: CancellationToken
): Promise<string> {
  const chatRequest = await lm.sendChatRequest(model, messages, {}, token);
  let response = "";
  for await (const fragment of chatRequest.stream) {
    response += fragment;
  }
  return response;
}

export async function getSampleDownloadUrlInfo(sampleId: string) {
  const sampleCollection = await sampleProvider.SampleCollection;
  const sample = sampleCollection.samples.find((sample) => sample.id === sampleId);
  if (!sample) {
    throw new Error("Sample not found");
  }
  return sample.downloadUrlInfo;
}

export function getTeamsApps(folders?: readonly WorkspaceFolder[]): string[] | undefined {
  const teamsApps = folders?.map((folder) => folder.uri.fsPath).filter((p) => isValidProjectV3(p));
  return teamsApps;
}

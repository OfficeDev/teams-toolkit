// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ChatRequest,
  CancellationToken,
  ChatResponseStream,
  LanguageModelChatMessage,
  LanguageModelChatUserMessage,
  lm,
  LanguageModelChatAssistantMessage,
} from "vscode";

import { sampleProvider } from "@microsoft/teamsfx-core";
import { BaseTokensPerCompletion, BaseTokensPerMessage, BaseTokensPerName } from "./consts";
import { isInputHarmfulSystemPrompt, isOutputHarmfulSystemPrompt } from "./officeAddinPrompts";
import { Tokenizer } from "./tokenizer";

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

// count message token for GPT3.5 and GPT4 message
// refer to vscode copilot tokenizer solution
export function countMessageTokens(message: LanguageModelChatMessage): number {
  let numTokens = BaseTokensPerMessage;
  const tokenizer = Tokenizer.getInstance();
  for (const [key, value] of Object.entries(message)) {
    if (!value) {
      continue;
    }
    numTokens += tokenizer.tokenLength(value);
    if (key === "name") {
      numTokens += BaseTokensPerName;
    }
  }
  return numTokens;
}

export function countMessagesTokens(messages: LanguageModelChatMessage[]): number {
  let numTokens = 0;
  for (const message of messages) {
    numTokens += countMessageTokens(message);
  }
  numTokens += BaseTokensPerCompletion;
  return numTokens;
}

export async function isInputHarmful(
  request: ChatRequest,
  token: CancellationToken
): Promise<boolean> {
  const isHarmfulMessage = [
    isInputHarmfulSystemPrompt,
    new LanguageModelChatUserMessage(request.prompt),
  ];
  const isHarmfulResponse = await getCopilotResponseAsString(
    "copilot-gpt-3.5-turbo",
    isHarmfulMessage,
    token
  );
  return isHarmfulResponse.toLowerCase().includes("yes");
}

export async function isOutputHarmful(output: string, token: CancellationToken): Promise<boolean> {
  const isHarmfulMessage = [
    isOutputHarmfulSystemPrompt,
    new LanguageModelChatAssistantMessage(output),
  ];
  const isHarmfulResponse = await getCopilotResponseAsString(
    "copilot-gpt-3.5-turbo",
    isHarmfulMessage,
    token
  );
  return isHarmfulResponse.toLowerCase().includes("yes");
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatAssistantMessage,
  LanguageModelChatMessage,
  LanguageModelChatSystemMessage,
  LanguageModelChatUserMessage,
  lm,
} from "vscode";

import { sampleProvider } from "@microsoft/teamsfx-core";
import { buildDynamicPrompt } from "../dynamic-prompt";
import { BaseTokensPerCompletion, BaseTokensPerMessage, BaseTokensPerName } from "./consts";
import { isContentHarmfulSystemPrompt } from "./officeAddinPrompts";
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
  return isOutputHarmful(request.prompt, token);
}

export async function isOutputHarmful(output: string, token: CancellationToken): Promise<boolean> {
  const userMessagePrompt = `
  Please send following message back to me in orginal format. Message: 
  ${output}
  `;
  const isHarmfulMessage = [
    isContentHarmfulSystemPrompt,
    new LanguageModelChatAssistantMessage(userMessagePrompt),
  ];
  async function getIsHarmfulResponseAsync() {
    const isHarmfulResponse = await getCopilotResponseAsString(
      "copilot-gpt-4",
      isHarmfulMessage,
      token
    );
    return isHarmfulResponse.toLowerCase().startsWith("true");
  }
  const promises = Array(1)
    .fill(null)
    .map(() => getIsHarmfulResponseAsync());
  const results = await Promise.all(promises);
  const isHarmful = results.filter((result) => result === true).length > 0;
  return isHarmful;
}

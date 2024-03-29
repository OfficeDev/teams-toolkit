// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ChatRequest,
  CancellationToken,
  ChatResponseStream,
  LanguageModelChatMessage,
  LanguageModelChatUserMessage,
  lm,
} from "vscode";

import { sampleProvider } from "@microsoft/teamsfx-core";
import { BaseTokensPerCompletion, BaseTokensPerMessage, BaseTokensPerName } from "./consts";
import { isInputHarmfulSystemPrompt } from "./officeAddinPrompts";
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
  const newUserMessage = `
  Determines whether the user's input: "${request.prompt}" falls into one of the following type of inputs based on the Responsible AI principles:
  | Type | Threshold |
  | -------- | -------- |
  | Harmful  | 10%  |
  | Hate & Fairness  | 10%  |
  | Sexism  | 50%  |
  | Harassment  | 10%  |
  | Sexual  | 50%  |
  | Offensive  | 50%  |
  | Racist  | 10%  |
  | Discriminatory  | 10%  |
  | Insulting  | 50%  |
  | Propensity for violence  | 10%  |
  | Illegal  | 50%  |
  | Jail-breaking  | 10%  |
  | Self-harm  | 20%  |
  | Copyright-infringing  | 10%  |
  | Stereotyping  | 10%  |

  Evaluate each type independently and give out your confidence level. If the level is greater or equal to the threshold, respond "yes". Otherwise, respond "no".
  `;
  const messages = [new LanguageModelChatUserMessage(newUserMessage)];
  const response = await getCopilotResponseAsString("copilot-gpt-4", messages, token);
  return response.toLowerCase().includes("yes");
}

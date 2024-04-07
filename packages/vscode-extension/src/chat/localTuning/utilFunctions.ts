// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CancellationToken, LanguageModelChatMessage, lm } from "vscode";
import { buildDynamicPrompt } from "../dynamicPrompt";
import { inputRai03 } from "../dynamicPrompt/formats";
import { IDynamicPromptFormat } from "../dynamicPrompt/utils/types";

export async function isHarmful_new(
  format: IDynamicPromptFormat<string>,
  prompt: string,
  token: CancellationToken
): Promise<boolean | string> {
  const messages = buildDynamicPrompt(format, prompt).messages;
  let response = await getCopilotResponseAsString("copilot-gpt-4", messages, token);

  try {
    const separatorIndex = response.indexOf("```");
    if (separatorIndex >= 0) {
      response = response.substring(0, separatorIndex);
    }
    const resultJson = JSON.parse(response);

    if (typeof resultJson.isHarmful !== "boolean") {
      return `New: Failed to parse response: isHarmful is not a boolean, response=${response}.`;
    }

    return resultJson.isHarmful;
  } catch (e) {
    const error = e as Error;

    throw new Error(`Failed to parse response: error=${error.message}, response=${response}.`);
  }
}

export async function isHarmful_old(
  request: string,
  token: CancellationToken
): Promise<boolean | string> {
  const phrases = generatePhrases(request);
  const messages = buildDynamicPrompt(inputRai03, phrases).messages;

  async function getIsHarmfulResponseAsync() {
    const response = await getCopilotResponseAsString("copilot-gpt-4", messages, token);
    if (response.indexOf("Sorry, I can't") === 0) {
      return true;
    }

    const score = Number.parseInt(response, 10);
    if (isNaN(score)) {
      throw Error(`Old: Failed to parse response: response=${response}.`);
    }

    return Number.parseInt(response) > 15; // This is a number we have to tune.
  }
  const promises = Array(1)
    .fill(null)
    .map(() => getIsHarmfulResponseAsync());
  const results = await Promise.all(promises);
  const isHarmful = results.filter((result) => result === true).length > 0;
  return isHarmful;
}

export async function getCopilotResponseAsString(
  model: "copilot-gpt-3.5-turbo" | "copilot-gpt-4",
  messages: LanguageModelChatMessage[],
  token: CancellationToken
): Promise<string> {
  const sendRequest = async () => {
    const chatRequest = await lm.sendChatRequest(model, messages, {}, token);
    let response = "";
    for await (const fragment of chatRequest.stream) {
      response += fragment;
    }
    return response;
  };

  const retryTimes = 8;
  for (let i = 0; i < retryTimes; ++i) {
    const response = await sendRequest();
    if (response) {
      return response;
    }

    if (i < retryTimes - 1) {
      const sleepTime = Math.min(1000 << i, 10000);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }

  throw Error("Failed to get response from Copilot.");
}

// brutely break the sentence into phrases, that LLM can handle with a better result
function generatePhrases(sentence: string): string[] {
  const words: string[] = sentence.split(" ");
  const phrases: string[] = [];
  const maxPhraseLength = 6;
  const minPhraseLength = 3;

  if (words.length < minPhraseLength) {
    phrases.push(sentence);
    return phrases;
  }

  const n: number = words.length > maxPhraseLength ? maxPhraseLength : words.length;
  for (let i = minPhraseLength; i <= n; i++) {
    for (let j = 0; j <= words.length - i; j++) {
      const phrase = words.slice(j, j + i).join(" ");
      if (
        phrase.toLowerCase().includes("office") ||
        phrase.toLowerCase().includes("addin") ||
        phrase.toLowerCase().includes("add-in") ||
        phrase.toLowerCase().includes("add in") ||
        phrase.toLowerCase().includes("javascript") ||
        phrase.toLowerCase().includes("api") ||
        phrase.toLowerCase().includes("microsoft") ||
        phrase.toLowerCase().includes("excel") ||
        phrase.toLowerCase().includes("word") ||
        phrase.toLowerCase().includes("powerpoint") ||
        phrase.toLowerCase().includes("code")
      ) {
        continue;
      }
      phrases.push(phrase);
    }
  }
  phrases.push(sentence);
  return phrases;
}

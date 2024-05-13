// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatRequest,
  LanguageModelChatMessage,
  LanguageModelChatMessageRole,
} from "vscode";
import { buildDynamicPrompt } from "./dynamicPrompt";
import { inputRai, outputRai } from "./dynamicPrompt/formats";
import { getCopilotResponseAsString } from "../chat/utils";
import { officeSampleProvider } from "./commands/create/officeSamples";

export async function purifyUserMessage(
  message: string,
  token: CancellationToken
): Promise<string> {
  const userMessagePrompt = `
  Please act as a professional Office JavaScript add-in developer and expert office application user, to rephrase the following meesage in an accurate and professional manner. Message: ${message}
  `;
  const systemPrompt = `
  You should only return the rephrased message, without any explanation or additional information. 
  
  There're some general terms has special meaning in the Microsoft Office or Office JavaScript add-in development, please make sure you're using the correct terms or keep it as it is. For example, "task pane" is preferred than "side panel" in Office JavaScript add-in developing, or keep "Annotation", "Comment", "Document", "Body", "Slide", "Range", "Note", etc. as they're refer to a feature in Office client.

  The rephrased message should be clear and concise for developer.
  `;
  const purifyUserMessage = [
    new LanguageModelChatMessage(LanguageModelChatMessageRole.User, userMessagePrompt),
    new LanguageModelChatMessage(LanguageModelChatMessageRole.System, systemPrompt),
  ];
  const purifiedResult = await getCopilotResponseAsString(
    "copilot-gpt-4",
    purifyUserMessage,
    token
  );
  if (
    !purifiedResult ||
    purifiedResult.length === 0 ||
    purifiedResult.indexOf("Sorry, I can't") === 0
  ) {
    return message;
  }
  return purifiedResult;
}

export async function isInputHarmful(
  request: ChatRequest,
  token: CancellationToken
): Promise<boolean> {
  const messages = buildDynamicPrompt(inputRai, request.prompt).messages;
  let response = await getCopilotResponseAsString("copilot-gpt-4", messages, token);
  if (!response) {
    throw new Error("Got empty response");
  }

  const separatorIndex = response.indexOf("```");
  if (separatorIndex >= 0) {
    response = response.substring(0, separatorIndex);
  }
  const resultJson = JSON.parse(response);

  if (typeof resultJson.isHarmful !== "boolean") {
    throw new Error(`Failed to parse response: isHarmful is not a boolean.`);
  }

  return resultJson.isHarmful;
}

export async function isOutputHarmful(output: string, token: CancellationToken): Promise<boolean> {
  const messages = buildDynamicPrompt(outputRai, output).messages;
  return await isContentHarmful(messages, token);
}

async function isContentHarmful(
  messages: LanguageModelChatMessage[],
  token: CancellationToken
): Promise<boolean> {
  async function getIsHarmfulResponseAsync() {
    const isHarmfulResponse = await getCopilotResponseAsString("copilot-gpt-4", messages, token);
    if (
      !isHarmfulResponse ||
      isHarmfulResponse === "" ||
      isHarmfulResponse.indexOf("Sorry, I can't") === 0
    ) {
      return true;
    }
    return Number.parseInt(isHarmfulResponse) > 15; // This is a number we have to tune.
  }
  const promises = Array(1)
    .fill(null)
    .map(() => getIsHarmfulResponseAsync());
  const results = await Promise.all(promises);
  const isHarmful = results.filter((result) => result === true).length > 0;
  return isHarmful;
}

export async function getOfficeSampleDownloadUrlInfo(sampleId: string) {
  const sampleCollection = await officeSampleProvider.OfficeSampleCollection;
  const sample = sampleCollection.samples.find((sample) => sample.id === sampleId);
  if (!sample) {
    throw new Error("Sample not found");
  }
  return sample.downloadUrlInfo;
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AgentRequest } from "./agent";
import { getResponseAsStringCopilotInteraction, getStringFieldFromCopilotResponseMaybeWithStrJson } from "./copilotInteractions";

export type IntentDetectionTarget = {
  name: string,
  intentDetectionDescription: string,
};

export async function detectIntent(targets: IntentDetectionTarget[], request: AgentRequest): Promise<IntentDetectionTarget | undefined> {
  const systemPrompt = getDetectIntentSystemPrompt1(targets);
  const maybeJsonCopilotResponse = await getResponseAsStringCopilotInteraction(systemPrompt, request);
  const determinedOption =
    getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "option") ||
    getStringFieldFromCopilotResponseMaybeWithStrJson(maybeJsonCopilotResponse, "intent");
  if (determinedOption === undefined) {
    return undefined;
  } else {
    const target = targets.find((target) => target.name === determinedOption);
    if (target === undefined) {
      return undefined;
    } else {
      return target;
    }
  }
}

function getDetectIntentSystemPrompt1(targets: IntentDetectionTarget[]) {
  const targetDescriptions = targets.map((target) => `'${target.name}' (${target.intentDetectionDescription})`).join(", ");
  return `You are an expert in determining which of the following options the user is interested. The options are: ${targetDescriptions}. Your job is to determine which option would most help the user based on their query. Choose one of the available options as the best option. Only repsond with a JSON object containing the option you choose. Do not respond in a coverstaional tone, only JSON. For example: { "option": "<one of the provided options>" }`;
}

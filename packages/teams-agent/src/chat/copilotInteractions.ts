/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { type AgentRequest } from "./agent";

export type CopilotInteractionResult = { copilotResponded: true, copilotResponse: string } | { copilotResponded: false, copilotResponse: undefined };

const maxCachedAccessAge = 1000 * 30;
let cachedAccess: { access: vscode.ChatAccess, requestedAt: number } | undefined;
async function getChatAccess(): Promise<vscode.ChatAccess> {
  if (cachedAccess === undefined || cachedAccess.access.isRevoked || cachedAccess.requestedAt < Date.now() - maxCachedAccessAge) {
    const newAccess = await vscode.chat.requestChatAccess("copilot");
    cachedAccess = { access: newAccess, requestedAt: Date.now() };
  }
  return cachedAccess.access;
}

const showDebugCopilotInteractionAsProgress = false;
function debugCopilotInteraction(progress: vscode.Progress<vscode.ChatAgentExtendedProgress>, msg: string) {
  if (showDebugCopilotInteractionAsProgress) {
    progress.report({ content: `\n\n${new Date().toISOString()} >> \`${msg.replace(/\n/g, "").trim()}\`\n\n` });
  }
  console.log(`${new Date().toISOString()} >> \`${msg.replace(/\n/g, "").trim()}\``);
}

/**
 * Feeds {@link systemPrompt} and {@link userContent} to Copilot and redirects the response directly to ${@link progress}.
 */
export async function verbatimCopilotInteraction(systemPrompt: string, request: AgentRequest): Promise<CopilotInteractionResult> {
  let joinedFragements = "";
  await queueCopilotInteraction((fragment) => {
    joinedFragements += fragment;
    request.progress.report({ content: fragment });
  }, systemPrompt, request);
  if (joinedFragements === "") {
    return { copilotResponded: false, copilotResponse: undefined };
  } else {
    return { copilotResponded: true, copilotResponse: joinedFragements };
  }
}

/**
 * Feeds {@link systemPrompt} and {@link userContent} to Copilot and directly returns its response.
 */
export async function getResponseAsStringCopilotInteraction(systemPrompt: string, request: AgentRequest): Promise<string | undefined> {
  let joinedFragements = "";
  await queueCopilotInteraction((fragment) => {
    joinedFragements += fragment;
  }, systemPrompt, request);
  debugCopilotInteraction(request.progress, `Copilot response:\n\n${joinedFragements}\n`);
  return joinedFragements;
}

let copilotInteractionQueueRunning = false;
type CopilotInteractionQueueItem = { onResponseFragment: (fragment: string) => void, systemPrompt: string, request: AgentRequest, resolve: () => void };
const copilotInteractionQueue: CopilotInteractionQueueItem[] = [];

export async function queueCopilotInteraction(onResponseFragment: (fragment: string) => void, systemPrompt: string, request: AgentRequest): Promise<void> {
  return new Promise<void>((resolve) => {
    copilotInteractionQueue.push({ onResponseFragment: onResponseFragment, systemPrompt: systemPrompt, request: request, resolve: resolve });
    if (!copilotInteractionQueueRunning) {
      copilotInteractionQueueRunning = true;
      void runCopilotInteractionQueue();
    }
  });
}

let lastCopilotInteractionRunTime: number = 0;
const timeBetweenCopilotInteractions = 1500;
async function runCopilotInteractionQueue() {
  while (copilotInteractionQueue.length > 0) {
    const queueItem = copilotInteractionQueue.shift();
    if (queueItem === undefined) {
      continue;
    }

    const timeSinceLastCopilotInteraction = Date.now() - lastCopilotInteractionRunTime;
    if (timeSinceLastCopilotInteraction < timeBetweenCopilotInteractions) {
      await new Promise((resolve) => setTimeout(resolve, timeBetweenCopilotInteractions - timeSinceLastCopilotInteraction));
    }

    lastCopilotInteractionRunTime = Date.now();

    await doCopilotInteraction(queueItem.onResponseFragment, queueItem.systemPrompt, queueItem.request);
    queueItem.resolve();
  }
  copilotInteractionQueueRunning = false;
}

async function doCopilotInteraction(onResponseFragment: (fragment: string) => void, systemPrompt: string, agentRequest: AgentRequest): Promise<void> {
  try {
    const access = await getChatAccess();
    const messages = [
      {
        role: vscode.ChatMessageRole.System,
        content: systemPrompt
      },
      {
        role: vscode.ChatMessageRole.User,
        content: agentRequest.userPrompt
      },
    ];

    debugCopilotInteraction(agentRequest.progress, `System Prompt:\n\n${systemPrompt}\n`);
    debugCopilotInteraction(agentRequest.progress, `User Content:\n\n${agentRequest.userPrompt}\n`);

    const request = access.makeRequest(messages, {}, agentRequest.token);
    for await (const fragment of request.response) {
      onResponseFragment(fragment);
    }
  } catch (e) {
    debugCopilotInteraction(agentRequest.progress, `Failed to do copilot interaction with system prompt '${systemPrompt}'. Error: ${JSON.stringify(e)}`);
  }
}

/**
 * Gets a string field from a Copilot response that may contain a stringified JSON object.
 * @param copilotResponseMaybeWithStrJson The Copilot response that might contain a stringified JSON object.
 * @param fieldNameOrNames The name of the field to get from the stringified JSON object. Will first look for fields that are an exact match, then will look for fields that contain the {@link fieldName}.
 * @param filter An optional list of strings to filter contains-matches by if there are multiple fields that contain the {@link fieldName}.
 */
export function getStringFieldFromCopilotResponseMaybeWithStrJson(copilotResponseMaybeWithStrJson: string | undefined, fieldNameOrNames: string | string[], filter?: string[]): string | undefined {
  if (copilotResponseMaybeWithStrJson === undefined) {
    return undefined;
  }

  try {
    const parsedCopilotResponse = parseCopilotResponseMaybeWithStrJson(copilotResponseMaybeWithStrJson);
    return findPossibleValuesOfFieldFromParsedCopilotResponse(parsedCopilotResponse, fieldNameOrNames, filter)
      .find((value): value is string => value !== undefined && value !== "" && typeof value === "string");
  } catch (e) {
    console.log(e);
    return undefined;
  }
}

/**
 * Gets a boolean field from a Copilot response that may contain a stringified JSON object.
 * @param copilotResponseMaybeWithStrJson The Copilot response that might contain a stringified JSON object.
 * @param fieldName The name of the field to get from the stringified JSON object. Will first look for fields that are an exact match, then will look for fields that contain the {@link fieldName}.
 * @param filter An optional list of strings to filter contains-matches by if there are multiple fields that contain the {@link fieldName}.
 */
export function getBooleanFieldFromCopilotResponseMaybeWithStrJson(copilotResponseMaybeWithStrJson: string | undefined, fieldName: string, filter?: string[]): boolean | undefined {
  if (copilotResponseMaybeWithStrJson === undefined) {
    return undefined;
  }

  try {
    const parsedCopilotResponse = parseCopilotResponseMaybeWithStrJson(copilotResponseMaybeWithStrJson);
    return findPossibleValuesOfFieldFromParsedCopilotResponse(parsedCopilotResponse, fieldName, filter)
      .filter((value): value is boolean | string => value !== undefined && (typeof value === "boolean" || typeof value === "string"))
      .map((value): string | boolean | undefined => typeof value === "boolean" ? value : value.toLowerCase() === "true" || value.toLowerCase() === "false" ? JSON.parse(value.toLowerCase()) as boolean : undefined)
      .find((value): value is boolean => value !== undefined && typeof value === "boolean");
  } catch (e) {
    console.log(e);
    return undefined;
  }
}

function parseCopilotResponseMaybeWithStrJson(copilotResponseMaybeWithStrJson: string): { [key: string]: (string | boolean | number | object) } {
  try {
    copilotResponseMaybeWithStrJson = copilotResponseMaybeWithStrJson
      .trim()
      .replace(/\n/g, "");
    if (copilotResponseMaybeWithStrJson.indexOf("{") === -1) {
      copilotResponseMaybeWithStrJson = "{" + copilotResponseMaybeWithStrJson;
    }
    if (copilotResponseMaybeWithStrJson.endsWith(",")) {
      copilotResponseMaybeWithStrJson = copilotResponseMaybeWithStrJson.substring(0, copilotResponseMaybeWithStrJson.length - 1);
    }
    if (copilotResponseMaybeWithStrJson.indexOf("}") === -1) {
      copilotResponseMaybeWithStrJson = copilotResponseMaybeWithStrJson + "}";
    }
    const maybeJsonCopilotResponse = copilotResponseMaybeWithStrJson.substring(copilotResponseMaybeWithStrJson.indexOf("{"), copilotResponseMaybeWithStrJson.lastIndexOf("}") + 1);
    return JSON.parse(maybeJsonCopilotResponse) as { [key: string]: (string | boolean | number | object) };
  } catch (e) {
    console.log(`Failed to parse copilot response maybe with string JSON, response: '${copilotResponseMaybeWithStrJson}'. Error: ${JSON.stringify(e)}`);
    return {};
  }
}

function findPossibleValuesOfFieldFromParsedCopilotResponse(parsedCopilotResponse: { [key: string]: (string | boolean | number | object) }, fieldNameOrNames: string | string[], filter?: string[]): (string | boolean | number | object)[] {
  const filedNames = Array.isArray(fieldNameOrNames) ? fieldNameOrNames : [fieldNameOrNames];
  for (const fieldName of filedNames) {
    const exactMatches = Object.keys(parsedCopilotResponse)
      .filter((key) => key.toLowerCase() === fieldName.toLowerCase());
    const containsMatches = Object.keys(parsedCopilotResponse)
      .filter((key) => key.toLowerCase().includes(fieldName.toLowerCase()))
      .filter((key) => filter === undefined || filter.every((filterValue) => !key.toLowerCase().includes(filterValue.toLowerCase())));
    const matchValues = [...exactMatches, ...containsMatches].map((key) => parsedCopilotResponse[key]);
    if (matchValues.length > 0) {
      return matchValues;
    }
  }
  return [];
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import axios from "axios";
import * as fs from "fs-extra";
import * as path from "path";
import * as tmp from "tmp";
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseFileTree,
  ChatResponseStream,
  ChatResult,
  LanguageModelChatUserMessage,
  Uri,
} from "vscode";

import { Correlator, TelemetrySuccess, getUuid, sampleProvider } from "@microsoft/teamsfx-core";
import {
  getSampleFileInfo,
  runWithLimitedConcurrency,
  sendRequestWithRetry,
} from "@microsoft/teamsfx-core/build/component/generator/utils";

import {
  TelemetryTriggerFrom,
  TelemetryEvent,
  TelemetryProperty,
} from "../../../telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import {
  CHAT_CREATE_SAMPLE_COMMAND_ID,
  OfficeAddinChatCommand,
  TeamsChatCommand,
} from "../../consts";
import {
  brieflyDescribeProjectSystemPrompt,
  defaultSystemPrompt,
  describeProjectSystemPrompt,
  getProjectMatchSystemPrompt,
} from "../../prompts";
import {
  getCopilotResponseAsString,
  getSampleDownloadUrlInfo,
  verbatimCopilotInteraction,
} from "../../utils";
import * as teamsTemplateMetadata from "./templateMetadata.json";
import { ProjectMetadata } from "./types";
import { TelemetryMetadata } from "../../telemetryData";
import { ICopilotChatResult, ITelemetryMetadata } from "../../types";
import * as util from "util";
import { localize } from "../../../utils/localizeUtils";

// TODO: Implement the function.
export default async function officeAddinCreateCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const messages = [defaultSystemPrompt(), new LanguageModelChatUserMessage(request.prompt)];
  await getCopilotResponseAsString("copilot-gpt-3.5-turbo", messages, token);
  return {
    metadata: {
      command: OfficeAddinChatCommand.Create,
      correlationId: Correlator.getId(),
    },
  };
}

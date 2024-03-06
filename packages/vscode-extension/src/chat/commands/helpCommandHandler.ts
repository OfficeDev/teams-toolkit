// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  ChatResult,
} from "vscode";
import { TeamsChatCommand } from "../consts";

export default function helpCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): ChatResult {
  // TBD
  return { metadata: { command: TeamsChatCommand.Help } };
}

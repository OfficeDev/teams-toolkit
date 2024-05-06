// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CancellationToken, ChatResponseStream, LanguageModelChatUserMessage } from "vscode";
import { Spec } from "./spec";
import { ExecutionResultEnum } from "./executionResultEnum";

export interface ISkill {
  name: string | undefined;
  capability: string | undefined;
  canInvoke: (spec: Spec) => boolean;
  invoke: (
    languageModel: LanguageModelChatUserMessage,
    response: ChatResponseStream,
    token: CancellationToken,
    spec: Spec
  ) => Promise<{ result: ExecutionResultEnum; spec: Spec }>;
}

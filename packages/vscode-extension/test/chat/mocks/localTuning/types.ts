// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ChatRequestHandler } from "vscode";
import { IDynamicPromptFormat } from "../../../../src/chat/dynamicPrompt/utils/types";

export type LocalTuningScenarioHandler = (
  ...params: Parameters<ChatRequestHandler>
) => Promise<void>;

export interface ILocalPromptTuningConfigurations {
  callCount: number;
  dynamicPromptFormat: IDynamicPromptFormat<string>;
  outputDir: string;
  userPrompts: string[];
}

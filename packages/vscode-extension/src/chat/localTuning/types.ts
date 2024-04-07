// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ChatRequestHandler } from "vscode";
import { IDynamicPromptPartialSettings } from "../dynamicPrompt/promptSettings";

export type LocalTuningScenarioHandler = (
  ...params: Parameters<ChatRequestHandler>
) => Promise<void>;

export interface ILocalPromptTuningConfigurations {
  callCount: number;
  dynamicPromptSettings: IDynamicPromptPartialSettings;
  outputDir: string;
  userPrompts: string[];
}

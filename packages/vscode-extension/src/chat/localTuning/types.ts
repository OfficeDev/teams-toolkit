// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ChatRequestHandler } from "vscode";
import { IDynamicPromptPartialSettings } from "../dynamicPrompt/promptSettings";

export type LocalTuningScenarioHandler = (
  ...params: Parameters<ChatRequestHandler>
) => Promise<void>;

export interface ILocalPromptTuningConfigurations {
  dynamicPromptSettings: IDynamicPromptPartialSettings;
  userPrompts: string[];
  callCount: number;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ProjectMetadata } from "./commands/create/types";

// TODO: Add prompts to match WXP samples.
export function getOfficeAddinProjectMatchSystemPrompt(projectMetadata: ProjectMetadata[]) {
  return new vscode.LanguageModelChatSystemMessage(``);
}

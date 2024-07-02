// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export interface DeclarativeCopilotManifestValidationResult {
  id: string;
  filePath: string;
  validationResult: string[];
  actionValidationResult: PluginManifestValidationResult[];
}

export interface PluginManifestValidationResult {
  id: string;
  filePath: string;
  validationResult: string[];
}

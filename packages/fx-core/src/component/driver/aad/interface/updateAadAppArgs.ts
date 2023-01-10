// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface UpdateAadAppArgs {
  manifestTemplatePath: string; // Relative path to project root
  outputFilePath: string; // Relative path to project root
  onlyBuild?: boolean; // Only build aad manifest for preview purpose
}

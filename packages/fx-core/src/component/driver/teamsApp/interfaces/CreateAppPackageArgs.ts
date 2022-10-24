// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateAppPackageArgs {
  /**
   * Teams app manifest template path
   */
  manifestTemplatePath: string;

  /**
   * Zipped app package path
   */
  outputZipPath: string;

  /**
   * Manifest file path
   */
  outputJsonPath: string;
}

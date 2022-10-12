// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateAppPackageArgs {
  /**
   * Teams app manifest template path
   */
  manifestTemplatePath: string;

  /**
   * Current workspace, this should be the common args
   */
  projectPath: string;

  /**
   * Zipped app package path
   */
  outputPath: string;
}

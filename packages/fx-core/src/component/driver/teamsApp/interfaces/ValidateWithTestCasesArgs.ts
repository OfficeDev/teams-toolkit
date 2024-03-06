// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ValidateWithTestCasesArgs {
  /**
   * Teams app package path
   */
  appPackagePath: string;
  /**
   * Internal arguments
   * Show message for non-life cycle command
   */
  showMessage?: boolean;
}

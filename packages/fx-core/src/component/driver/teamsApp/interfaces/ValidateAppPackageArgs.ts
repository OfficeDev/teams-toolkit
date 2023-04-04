// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ning Liu <nliu@microsoft.com>
 */

export interface ValidateAppPackageArgs {
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

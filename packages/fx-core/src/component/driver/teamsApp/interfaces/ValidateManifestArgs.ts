// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ValidateManifestArgs {
  /**
   * Teams app manifest path
   */
  manifestPath: string;
  /**
   * Internal arguments
   * Show message for non-life cycle command
   */
  showMessage?: boolean;
}

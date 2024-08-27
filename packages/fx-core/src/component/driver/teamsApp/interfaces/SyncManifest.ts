// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface SyncManifestArgs {
  /**
   * Teams app project path
   */
  projectPath: string;
  /**
   * Environment
   */
  env: string;
  /**
   * Teams app id
   */
  teamsAppId?: string;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SyncManifestInputs } from "../../../../question";
import { AppDefinition } from "./appdefinitions/appDefinition";

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

export interface SyncManifestInputsForVS extends SyncManifestInputs {
  teamsAppFromTdp: AppDefinition;
}

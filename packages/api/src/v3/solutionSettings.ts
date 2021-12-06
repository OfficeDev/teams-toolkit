// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings } from "../types";
/**
 * Module is basic building block of the App
 */
export interface Module {
  /**
   * capabilities that the module supports
   */
  capabilities: string[];
  /**
   * root directory name
   */
  dir?: string;
  /**
   * relative path for the built artifact, it can be a folder path or a file path, depends the deployment type
   */
  buildPath?: string;
  /**
   * hostingPlugin is available after add resource, this is an mapping between module and resource plugin
   */
  hostingPlugin?: string;
  /**
   * deployment type for bits
   */
  deployType?: string;
}

export interface TeamsFxSolutionSettings extends AzureSolutionSettings {
  /**
   * upgrade solution settings version to 3.0.0
   */
  version: "3.0.0";
  modules: Module[];
}

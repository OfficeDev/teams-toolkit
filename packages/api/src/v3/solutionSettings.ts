// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings } from "../types";
/**
 * Module is basic building block of the App
 */
export interface Module {
  /**
   * root directory name
   */
  dir?: string;
  /**
   * build directory name
   */
  buildDir?: string;
  /**
   * hostingPlugin is available after add resource, this is an important mapping between module and resource plugin
   */
  hostingPlugin?: string;
}

export interface TeamsFxSolutionSettings extends AzureSolutionSettings {
  /**
   * upgrade solution settings version to 3.0.0
   */
  version: "3.0.0";
  /**
   * modules are added after adding capability for the App
   */
  modules: {
    tab?: Module;
    bot?: Module;
    backends?: Module[];
  };
}

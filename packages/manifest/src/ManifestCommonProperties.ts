// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ManifestCommonProperties {
  /**
   * Capabilities, e.g. "staticTab" | "configurableTab" | "MessageExtension" | "WebApplicationInfo"
   */
  capabilities: string[];
  /**
   * Teams app id
   */
  id: string;
  /**
   * Teams app version, e.g.
   */
  version: string;
  /**
   * manifest version, e.g. 1.16
   */
  manifestVersion: string;
  /**
   * If it's copilot plugin app
   */
  isCopilotPlugin: boolean;
  /**
   * If it's SPFx Teams app
   */
  isSPFx: boolean;
}

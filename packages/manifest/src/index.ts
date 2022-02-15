// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsAppManifest, IStaticTab, IConfigurableTab } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";

export class Manifest {
  /**
   * Load manifest from manifest.json
   * @param filePath path to the manifest.json file
   * @throws FileNotFoundError - when file not found
   * @throws InvalidManifestError - when file is not a valid json or can not be parsed to TeamsAppManifest
   */
  static async load(filePath: string): Promise<TeamsAppManifest> {
    return new TeamsAppManifest();
  }

  /**
   * Save manifest to .json file
   * @param filePath path to the manifest.json file
   * @param manifest
   */
  static async save(filePath: string, manifest: TeamsAppManifest): Promise<void> {}

  /**
   * Validate manifest against json schema
   * @param manifest
   * @returns {string[]} An array of error string
   */
  static async validate(manifest: TeamsAppManifest): Promise<string[]> {
    return [];
  }

  /**
   * Register a Teams app or update the existing Teams app
   * @param filePath path to the zip file, with manifest and icons
   * @param accessToken Access token with https://dev.teams.microsoft.com/AppDefinitions.ReadWrite scope
   * @returns {string} Teams app id
   */
  static async deploy(filePath: string, accessToken: string): Promise<string> {
    return "";
  }


  /// strech goal

  /**
   * Provide an initial manifest file, without capabilities
   * @param filePath path to the manifest.json file
   */
  static async init(filePath: string): Promise<void> {}

  /**
   * Add static tab to manifest
   * @param manifest
   */
  static async addStaticTab(manfiest: TeamsAppManifest, tab: IStaticTab): Promise<void> {}

  /**
   * Add configurable tab to manifest
   * @param manifest
   */
  static async addConfigurableTab(manfiest: TeamsAppManifest, tab: IConfigurableTab): Promise<void> {}

  /**
   * Publish a Teams app to Teams app catalog
   * @param filePath path to the zip file, with manifest and icons
   * @param accessToken Access token with https://dev.teams.microsoft.com/AppDefinitions.ReadWrite scope
   * @returns {string} Published Teams app id, which is different from Teams app id in Developer Portal
   */
  static async publish(filePath: string, accessToken: string): Promise<string> {
    return "";
  }
}

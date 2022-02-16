// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsAppManifest, IStaticTab, IConfigurableTab } from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";

export class Manifest {
  private manifest: TeamsAppManifest;

  constructor(manifest?: TeamsAppManifest) {
    if (manifest) {
      this.manifest = manifest;
    } else {
      this.manifest = new TeamsAppManifest();
    }
  }

  static async initWithAppName(appName: string): Promise<Manifest> {
    const manifest = new TeamsAppManifest();
    manifest.name.short = appName;
    manifest.name.full = appName;
    return new Manifest(manifest);
  }
  /**
   * Load manifest from manifest.json
   * @param filePath path to the manifest.json file
   * @throws FileNotFoundError - when file not found
   * @throws InvalidManifestError - when file is not a valid json or can not be parsed to TeamsAppManifest
   */
  static async loadFromPath(filePath: string): Promise<Manifest> {
    const manifest = await fs.readJson(filePath);
    return new Manifest(manifest);
  }

  /**
   * Save manifest to .json file
   * @param filePath path to the manifest.json file
   */
  async save(filePath: string): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(this.manifest, null, 4));
  }

  /**
   * Validate manifest against json schema
   * @returns {string[]} An array of error string
   */
  async validate(): Promise<string[]> {
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
   * Add static tab to manifest
   * @param tab
   */
  async addStaticTab(tab: IStaticTab): Promise<void> {}

  /**
   * Add configurable tab to manifest
   * @param tab
   */
  async addConfigurableTab( tab: IConfigurableTab): Promise<void> {}

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

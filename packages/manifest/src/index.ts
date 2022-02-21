// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsAppManifest } from "./manifest";

export * from "./manifest";

/**
 * Loads the manifest file from the given path.
 * @param path The path to the manifest file.
 * @returns The Manifest Object. 
 */
export async function loadFromPath(path: string): Promise<TeamsAppManifest> {
  throw new Error("Method not implemented.");
}

/**
 * Writes the manifest object to the given path.
 * 
 * @param path Where to write
 * @param manifest Manifest object to be saved
 */
export async function writeToPath(path: string, manifest: TeamsAppManifest): Promise<void> {
  throw new Error("Method not implemented.");
}

/**
 * Validate manifest against json schema
 * @returns {string[]} An array of error string
 */
export async function validateManifest(manifest: TeamsAppManifest): Promise<string[]> {
  throw new Error("Method not implemented.");
}

/**
 * Register a Teams app or update the existing Teams app
 * @param filePath path to the zip file, with manifest and icons
 * @param accessToken Access token with https://dev.teams.microsoft.com/AppDefinitions.ReadWrite scope
 * @returns {string} Teams app id
 */
export async function deploy(filePath: string, accessToken: string): Promise<string> {
  throw new Error("Method not implemented.");
}

/**
 * Publish a Teams app to Teams app catalog
 * @param filePath path to the zip file, with manifest and icons
 * @param accessToken Access token with https://dev.teams.microsoft.com/AppDefinitions.ReadWrite scope
 * @returns {string} Published Teams app id, which is different from Teams app id in Developer Portal
 */
export async function publish(filePath: string, accessToken: string): Promise<string> {
  throw new Error("Method not implemented.");
}
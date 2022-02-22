// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsAppManifest } from "./manifest";
import fs from "fs-extra";
import Ajv from "ajv-draft-04";
import { JSONSchemaType, Schema } from "ajv"; 
import axios, { AxiosResponse } from "axios";

export * from "./manifest";

/**
 * Loads the manifest from the given path without validating its schema.
 * 
 * @param path - The path to the manifest file.
 * @throws Will propagate any error thrown by the fs-extra#readJson.
 * 
 * @returns The Manifest Object. 
 */
export async function loadFromPath(path: string): Promise<TeamsAppManifest> {
  return fs.readJson(path);
}

/**
 * Writes the manifest object to the given path.
 * 
 * @param path - Where to write
 * @param manifest - Manifest object to be saved
 * @throws Will propagate any error thrown by the fs-extra#writeJson.
 * 
 */
export async function writeToPath(path: string, manifest: TeamsAppManifest): Promise<void> {
  return fs.writeJson(path, manifest)
}

/**
 * Validate manifest against json schema.
 * 
 * @param manifest - Manifest object to be validated
 * @param schema - teams-app-manifest schema
 * @returns An empty array if validation succeeds, or an array of error string otherwise. 
 */
export async function validateManifestAgainstSchema(manifest: TeamsAppManifest, schema: JSONSchemaType<TeamsAppManifest>): Promise<string[]> {
  const ajv = new Ajv({ formats: { uri: true } });
  const validate = ajv.compile(schema);
  const valid = validate(manifest);
  if (!valid && validate.errors) {
    return validate.errors?.map((error) => 
      `${error.instancePath} ${error.message}`
    );
  } else {
    return [];
  }
}

/**
 * Validate manifest against {@link TeamsAppManifest#$schema}.
 * 
 * @param manifest - Manifest object to be validated
 * @returns An empty array if validation succeeds, or an array of error string otherwise. 
 */
export async function validateManifest(manifest: TeamsAppManifest): Promise<string[]> {
  if (!manifest.$schema) {
    throw new Error("Manifest does not have a $schema property");
  }
  let result: AxiosResponse<any>
  try {
    const axiosInstance = axios.create();
    result = await axiosInstance.get(manifest.$schema);
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new Error(`Failed to get manifest at url ${manifest.$schema} due to: ${e.message}`);
    } else {
      throw new Error(`Failed to get manifest at url ${manifest.$schema} due to: unknown error`);
    }
  }

  return validateManifestAgainstSchema(manifest, result.data);
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
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsAppManifest } from "./manifest";
import fs from "fs-extra";
import Ajv from "ajv-draft-04";
import { JSONSchemaType } from "ajv";
import axios, { AxiosResponse } from "axios";
import { DevPreviewSchema } from "./devPreviewManifest";

export * from "./manifest";
export * as devPreview from "./devPreviewManifest";
export type TeamsAppManifestJSONSchema = JSONSchemaType<TeamsAppManifest>;
export type DevPreviewManifestJSONSchema = JSONSchemaType<DevPreviewSchema>;

export type Manifest = TeamsAppManifest | DevPreviewSchema;

export class ManifestUtil {
  /**
   * Loads the manifest from the given path without validating its schema.
   *
   * @param path - The path to the manifest file.
   * @throws Will propagate any error thrown by the fs-extra#readJson.
   *
   * @returns The Manifest Object.
   */
  static async loadFromPath<T extends Manifest = TeamsAppManifest>(path: string): Promise<T> {
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
  static async writeToPath<T extends Manifest = TeamsAppManifest>(
    path: string,
    manifest: T
  ): Promise<void> {
    return fs.writeJson(path, manifest, { spaces: 4 });
  }

  /**
   * Validate manifest against json schema.
   *
   * @param manifest - Manifest object to be validated
   * @param schema - teams-app-manifest schema
   * @returns An empty array if it passes validation, or an array of error string otherwise.
   */
  static async validateManifestAgainstSchema<T extends Manifest = TeamsAppManifest>(
    manifest: T,
    schema: JSONSchemaType<T>
  ): Promise<string[]> {
    const ajv = new Ajv({ formats: { uri: true } });
    const validate = ajv.compile(schema);
    const valid = validate(manifest);
    if (!valid && validate.errors) {
      return validate.errors?.map((error) => `${error.instancePath} ${error.message}`);
    } else {
      return [];
    }
  }

  /**
   * Validate manifest against {@link TeamsAppManifest#$schema}.
   *
   * @param manifest - Manifest object to be validated
   * @throws Will throw if {@link TeamsAppManifest#$schema} is undefined, not valid
   *         or there is any network failure when getting the schema.
   *
   * @returns An empty array if schema validation passes, or an array of error string otherwise.
   */
  static async validateManifest<T extends Manifest = TeamsAppManifest>(
    manifest: T
  ): Promise<string[]> {
    if (!manifest.$schema) {
      throw new Error("Manifest does not have a $schema property");
    }
    let result: AxiosResponse<any>;
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

    return ManifestUtil.validateManifestAgainstSchema(manifest, result.data);
  }
}

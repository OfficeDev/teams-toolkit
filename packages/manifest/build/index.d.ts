import { TeamsAppManifest } from "./manifest";
import { JSONSchemaType } from "ajv";
export * from "./manifest";
export declare type TeamsAppManifestJSONSchema = JSONSchemaType<TeamsAppManifest>;
export declare class ManifestUtil {
    /**
     * Loads the manifest from the given path without validating its schema.
     *
     * @param path - The path to the manifest file.
     * @throws Will propagate any error thrown by the fs-extra#readJson.
     *
     * @returns The Manifest Object.
     */
    static loadFromPath(path: string): Promise<TeamsAppManifest>;
    /**
     * Writes the manifest object to the given path.
     *
     * @param path - Where to write
     * @param manifest - Manifest object to be saved
     * @throws Will propagate any error thrown by the fs-extra#writeJson.
     *
     */
    static writeToPath(path: string, manifest: TeamsAppManifest): Promise<void>;
    /**
     * Validate manifest against json schema.
     *
     * @param manifest - Manifest object to be validated
     * @param schema - teams-app-manifest schema
     * @returns An empty array if it passes validation, or an array of error string otherwise.
     */
    static validateManifestAgainstSchema(manifest: TeamsAppManifest, schema: TeamsAppManifestJSONSchema): Promise<string[]>;
    /**
     * Validate manifest against {@link TeamsAppManifest#$schema}.
     *
     * @param manifest - Manifest object to be validated
     * @throws Will throw if {@link TeamsAppManifest#$schema} is undefined, not valid
     *         or there is any network failure when getting the schema.
     *
     * @returns An empty array if schema validation passes, or an array of error string otherwise.
     */
    static validateManifest(manifest: TeamsAppManifest): Promise<string[]>;
}
//# sourceMappingURL=index.d.ts.map
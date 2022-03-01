"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManifestUtil = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = (0, tslib_1.__importDefault)(require("fs-extra"));
const ajv_draft_04_1 = (0, tslib_1.__importDefault)(require("ajv-draft-04"));
const axios_1 = (0, tslib_1.__importDefault)(require("axios"));
(0, tslib_1.__exportStar)(require("./manifest"), exports);
class ManifestUtil {
    /**
     * Loads the manifest from the given path without validating its schema.
     *
     * @param path - The path to the manifest file.
     * @throws Will propagate any error thrown by the fs-extra#readJson.
     *
     * @returns The Manifest Object.
     */
    static async loadFromPath(path) {
        return fs_extra_1.default.readJson(path);
    }
    /**
     * Writes the manifest object to the given path.
     *
     * @param path - Where to write
     * @param manifest - Manifest object to be saved
     * @throws Will propagate any error thrown by the fs-extra#writeJson.
     *
     */
    static async writeToPath(path, manifest) {
        return fs_extra_1.default.writeJson(path, manifest, { spaces: 4 });
    }
    /**
     * Validate manifest against json schema.
     *
     * @param manifest - Manifest object to be validated
     * @param schema - teams-app-manifest schema
     * @returns An empty array if it passes validation, or an array of error string otherwise.
     */
    static async validateManifestAgainstSchema(manifest, schema) {
        var _a;
        const ajv = new ajv_draft_04_1.default({ formats: { uri: true } });
        const validate = ajv.compile(schema);
        const valid = validate(manifest);
        if (!valid && validate.errors) {
            return (_a = validate.errors) === null || _a === void 0 ? void 0 : _a.map((error) => `${error.instancePath} ${error.message}`);
        }
        else {
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
    static async validateManifest(manifest) {
        if (!manifest.$schema) {
            throw new Error("Manifest does not have a $schema property");
        }
        let result;
        try {
            const axiosInstance = axios_1.default.create();
            result = await axiosInstance.get(manifest.$schema);
        }
        catch (e) {
            if (e instanceof Error) {
                throw new Error(`Failed to get manifest at url ${manifest.$schema} due to: ${e.message}`);
            }
            else {
                throw new Error(`Failed to get manifest at url ${manifest.$schema} due to: unknown error`);
            }
        }
        return ManifestUtil.validateManifestAgainstSchema(manifest, result.data);
    }
}
exports.ManifestUtil = ManifestUtil;
//# sourceMappingURL=index.js.map
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  PluginManifestSchema,
  Result,
  TeamsAppManifest,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { FileNotFoundError, JSONSyntaxError } from "../../../../error/common";
import stripBom from "strip-bom";
import path from "path";
import { manifestUtils } from "./ManifestUtils";
import { ObjectIsUndefinedError } from "../../../../core/error";

export class PluginManifestUtils {
  public async readPluginManifestFile(
    path: string
  ): Promise<Result<PluginManifestSchema, FxError>> {
    if (!(await fs.pathExists(path))) {
      return err(new FileNotFoundError("PluginManifestUtils", path));
    }
    // Be compatible with UTF8-BOM encoding
    // Avoid Unexpected token error at JSON.parse()
    let content = await fs.readFile(path, { encoding: "utf-8" });
    content = stripBom(content);

    try {
      const manifest = JSON.parse(content) as PluginManifestSchema;
      return ok(manifest);
    } catch (e) {
      return err(new JSONSyntaxError(path, e, "PluginManifestUtils"));
    }
  }

  public async getApiSpecFilePathFromTeamsManifest(
    manifest: TeamsAppManifest,
    manifestPath: string
  ): Promise<Result<string, FxError>> {
    const pluginFilePath = await manifestUtils.getPluginFile(manifest, manifestPath);
    if (!pluginFilePath) {
      return err(new FileNotFoundError("PluginManifestUtils", manifestPath));
    }
    const pluginContentRes = await this.readPluginManifestFile(pluginFilePath);
    if (pluginContentRes.isErr()) {
      return err(pluginContentRes.error);
    }
    const apiSpecFilePathRes = await this.getApiSpecFilePathFromPlugin(
      pluginContentRes.value,
      manifestPath
    );
    if (apiSpecFilePathRes.isErr()) {
      return err(apiSpecFilePathRes.error);
    }

    return ok(apiSpecFilePathRes.value);
    _;
  }

  async getApiSpecFilePathFromPlugin(
    plugin: PluginManifestSchema,
    pluginPath: string
  ): Promise<Result<string, FxError>> {
    const runtimes = plugin.runtimes;
    if (!runtimes) {
      return err(new ObjectIsUndefinedError("runtimes"));
    }
    for (const runtime of runtimes) {
      if (runtime.type === "OpenApi" && runtime.spec?.url) {
        const specFile = path.resolve(path.dirname(pluginPath), runtime.spec.url);
        console.log(specFile);
        if (await fs.pathExists(specFile)) {
          return ok(specFile);
        }
      }
    }

    return err(new ObjectIsUndefinedError("apiSpec")); // TODO: more specific error type
  }
}

export const pluginManifestUtils = new PluginManifestUtils();

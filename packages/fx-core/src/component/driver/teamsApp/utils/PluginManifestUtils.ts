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
  ): Promise<Result<string[], FxError>> {
    const pluginFilePathRes = await manifestUtils.getPluginFilePath(manifest, manifestPath);
    if (pluginFilePathRes.isErr()) {
      return err(pluginFilePathRes.error);
    }
    const pluginFilePath = pluginFilePathRes.value;
    const pluginContentRes = await this.readPluginManifestFile(pluginFilePath);
    if (pluginContentRes.isErr()) {
      return err(pluginContentRes.error);
    }
    const apiSpecFiles = await this.getApiSpecFilePathFromPlugin(
      pluginContentRes.value,
      pluginFilePath
    );
    return ok(apiSpecFiles);
  }

  async getApiSpecFilePathFromPlugin(
    plugin: PluginManifestSchema,
    pluginPath: string
  ): Promise<string[]> {
    const runtimes = plugin.runtimes;
    const files: string[] = [];
    if (!runtimes) {
      return files;
    }
    for (const runtime of runtimes) {
      if (runtime.type === "OpenApi" && runtime.spec?.url) {
        const specFile = path.resolve(path.dirname(pluginPath), runtime.spec.url);
        if (await fs.pathExists(specFile)) {
          files.push(specFile);
        }
      }
    }

    return files;
  }
}

export const pluginManifestUtils = new PluginManifestUtils();

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Colors,
  FxError,
  IPlugin,
  ManifestUtil,
  Platform,
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
import { WrapDriverContext } from "../../util/wrapUtil";
import { getResolvedManifest } from "./utils";
import { TelemetryPropertyKey } from "./telemetry";
import { AppStudioResultFactory } from "../results";
import { AppStudioError } from "../errors";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { PluginManifestValidationResult } from "../interfaces/ValidationResult";
import { SummaryConstant } from "../../../configManager/constant";
import { EOL } from "os";

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

  /**
   * Get plugin manifest with env value filled.
   * @param path path of declaraitve Copilot
   * @returns resolved manifest
   */
  public async getManifest(
    path: string,
    context?: WrapDriverContext
  ): Promise<Result<PluginManifestSchema, FxError>> {
    const manifestRes = await this.readPluginManifestFile(path);
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }
    // Add environment variable keys to telemetry
    const resolvedManifestRes = getResolvedManifest(
      JSON.stringify(manifestRes.value),
      path,
      TelemetryPropertyKey.customizedAIPluginKeys,
      context
    );

    if (resolvedManifestRes.isErr()) {
      return err(resolvedManifestRes.error);
    }
    const resolvedManifestString = resolvedManifestRes.value;
    return ok(JSON.parse(resolvedManifestString));
  }

  public async validateAgainstSchema(
    plugin: IPlugin,
    path: string,
    context?: WrapDriverContext
  ): Promise<Result<PluginManifestValidationResult, FxError>> {
    const manifestRes = await this.getManifest(path, context);
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }

    try {
      const res = await ManifestUtil.validateManifest(manifestRes.value);
      return ok({
        id: plugin.id,
        filePath: path,
        validationResult: res,
      });
    } catch (e: any) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.ValidationFailedError.name,
          AppStudioError.ValidationFailedError.message([
            getLocalizedString(
              "error.appstudio.validateFetchSchemaFailed",
              manifestRes.value.$schema,
              e.message
            ),
          ])
        )
      );
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

  public logValidationErrors(
    validationRes: PluginManifestValidationResult,
    platform: Platform
  ): string | Array<{ content: string; color: Colors }> {
    const validationErrors = validationRes.validationResult;
    const filePath = validationRes.filePath;
    if (validationErrors.length === 0) {
      return "";
    }

    if (platform !== Platform.CLI) {
      const errors = validationErrors
        .map((error: string) => {
          return `${SummaryConstant.Failed} ${error}`;
        })
        .join(EOL);
      return (
        getLocalizedString("driver.teamsApp.summary.validatePluginManifest.checkPath", filePath) +
        EOL +
        errors
      );
    } else {
      const outputMessage = [];
      outputMessage.push({
        content:
          getDefaultString("driver.teamsApp.summary.validatePluginManifest.checkPath", filePath) +
          "\n",
        color: Colors.BRIGHT_WHITE,
      });
      validationErrors.map((error: string) => {
        outputMessage.push({ content: `${SummaryConstant.Failed} `, color: Colors.BRIGHT_RED });
        outputMessage.push({
          content: `${error}\n`,
          color: Colors.BRIGHT_WHITE,
        });
      });

      return outputMessage;
    }
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

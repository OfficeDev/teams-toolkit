// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import AdmZip from "adm-zip";
import { v4 } from "uuid";
import * as path from "path";
import isUUID from "validator/lib/isUUID";
import { TeamsAppManifest } from "@microsoft/teamsfx-api";
import { StepDriver } from "../../interface/stepDriver";
import { DriverContext } from "../../interface/commonArgs";
import { CreateAppPackageArgs } from "./interfaces/CreateAppPackageArgs";
import { manifestUtils } from "../../resource/appManifest/utils/ManifestUtils";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { Constants, DEFAULT_DEVELOPER } from "../../resource/appManifest/constants";
import { compileHandlebarsTemplateString } from "../../../common/tools";

const actionName = "teamsApp/createAppPackage";

export class CreateTeamsAppDriver implements StepDriver {
  public async run(
    args: CreateAppPackageArgs,
    context: DriverContext
  ): Promise<Map<string, string>> {
    const state = this.loadCurrentState();
    const manifestRes = await manifestUtils._readAppManifest(args.manifestTemplatePath);
    if (manifestRes.isErr()) {
      throw manifestRes.error;
    }
    let manifest: TeamsAppManifest = manifestRes.value;
    if (!isUUID(manifest.id)) {
      manifest.id = v4();
    }

    // Adjust template for samples with unnecessary placeholders
    const capabilities = manifestUtils._getCapabilities(manifest);
    if (capabilities.isErr()) {
      throw capabilities.error;
    }
    const hasFrontend =
      capabilities.value.includes("staticTab") || capabilities.value.includes("configurableTab");
    const tabEndpoint = state.TAB_ENDPOINT;
    if (!tabEndpoint && !hasFrontend) {
      manifest.developer = DEFAULT_DEVELOPER;
    }

    const manifestTemplateString = JSON.stringify(manifest);

    // TODO: Need to add customized keys to telemetry
    // const customizedKeys = getCustomizedKeys("", JSON.parse(manifestTemplateString));
    // if (telemetryProps) {
    //   telemetryProps[TelemetryPropertyKey.customizedKeys] = JSON.stringify(customizedKeys);
    // }
    // Render mustache template with state and config

    const resolvedManifestString = compileHandlebarsTemplateString(manifestTemplateString, state);
    manifest = JSON.parse(resolvedManifestString);

    // TODO: deal with relatvie path
    // Environment variable will be replaced with actual value
    // ./build/appPackage/appPackage.dev.zip instead of ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
    const zipFileName = args.outputPath;

    const appDirectory = path.dirname(args.manifestTemplatePath);
    const colorFile = path.join(appDirectory, manifest.icons.color);
    if (!(await fs.pathExists(colorFile))) {
      const error = AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(colorFile)
      );
      throw error;
    }

    const outlineFile = path.join(appDirectory, manifest.icons.outline);
    if (!(await fs.pathExists(outlineFile))) {
      const error = AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(outlineFile)
      );
      throw error;
    }

    const zip = new AdmZip();
    zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest, null, 4)));

    // outline.png & color.png, relative path
    let dir = path.dirname(manifest.icons.color);
    zip.addLocalFile(colorFile, dir === "." ? "" : dir);
    dir = path.dirname(manifest.icons.outline);
    zip.addLocalFile(outlineFile, dir === "." ? "" : dir);

    zip.writeZip(zipFileName);

    // TODO: should we keep manifest json as well?
    // const manifestFileName = path.join(buildFolderPath, `manifest.${envInfo.envName}.json`);
    // if (await fs.pathExists(manifestFileName)) {
    //     await fs.chmod(manifestFileName, 0o777);
    // }
    // await fs.writeFile(manifestFileName, JSON.stringify(manifest, null, 4));
    // await fs.chmod(manifestFileName, 0o444);

    return new Map([["outputPath", zipFileName]]);
  }

  private loadCurrentState() {
    // TODO: load all the required env variables, including configs
    return {
      TAB_ENDPOINT: process.env.TAB_ENDPOINT,
      BOT_ID: process.env.BOT_ID,
    };
  }
}

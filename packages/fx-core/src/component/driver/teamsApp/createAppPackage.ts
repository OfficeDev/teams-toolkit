// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import AdmZip from "adm-zip";
import * as path from "path";
import { hooks } from "@feathersjs/hooks/lib";
import { pathToFileURL } from "url";
import { Platform, Colors } from "@microsoft/teamsfx-api";
import { Result, FxError, ok, err } from "@microsoft/teamsfx-api";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { CreateAppPackageArgs } from "./interfaces/CreateAppPackageArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { manifestUtils } from "../../resource/appManifest/utils/ManifestUtils";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { Constants } from "../../resource/appManifest/constants";
import { getLocalizedString } from "../../../common/localizeUtils";
import { VSCodeExtensionCommand } from "../../../common/constants";

const actionName = "teamsApp/createAppPackage";

export class CreateAppPackageDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: CreateAppPackageArgs,
    context: DriverContext,
    withEmptyCapabilities?: boolean
  ): Promise<Result<Map<string, string>, FxError>> {
    const state = this.loadCurrentState();
    const manifestRes = await manifestUtils.getManifestV3(
      args.manifestTemplatePath,
      state,
      withEmptyCapabilities
    );
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }
    const manifest = manifestRes.value;
    // Deal with relative path
    // Environment variables should have been replaced by value
    // ./build/appPackage/appPackage.dev.zip instead of ./build/appPackage/appPackage.${{TEAMSFX_ENV}}.zip
    let zipFileName = args.outputZipPath;
    if (!path.isAbsolute(zipFileName)) {
      zipFileName = path.join(context.projectPath, zipFileName);
    }
    const zipFileDir = path.dirname(zipFileName);
    await fs.mkdir(zipFileDir, { recursive: true });

    const jsonFileName = args.outputJsonPath;
    if (!path.isAbsolute(jsonFileName)) {
      zipFileName = path.join(context.projectPath, jsonFileName);
    }
    const jsonFileDir = path.dirname(jsonFileName);
    await fs.mkdir(jsonFileDir, { recursive: true });

    let appDirectory = path.dirname(args.manifestTemplatePath);
    if (!path.isAbsolute(appDirectory)) {
      appDirectory = path.join(context.projectPath, appDirectory);
    }

    const colorFile = path.join(appDirectory, manifest.icons.color);
    if (!(await fs.pathExists(colorFile))) {
      const error = AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(colorFile)
      );
      return err(error);
    }

    const outlineFile = path.join(appDirectory, manifest.icons.outline);
    if (!(await fs.pathExists(outlineFile))) {
      const error = AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(outlineFile)
      );
      return err(error);
    }

    const zip = new AdmZip();
    zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest, null, 4)));

    // outline.png & color.png, relative path
    let dir = path.dirname(manifest.icons.color);
    zip.addLocalFile(colorFile, dir === "." ? "" : dir);
    dir = path.dirname(manifest.icons.outline);
    zip.addLocalFile(outlineFile, dir === "." ? "" : dir);

    zip.writeZip(zipFileName);

    if (await fs.pathExists(jsonFileName)) {
      await fs.chmod(jsonFileName, 0o777);
    }
    await fs.writeFile(jsonFileName, JSON.stringify(manifest, null, 4));
    await fs.chmod(jsonFileName, 0o444);

    if (context.platform === Platform.CLI || context.platform === Platform.VS) {
      const builtSuccess = [
        { content: "(√)Done: ", color: Colors.BRIGHT_GREEN },
        { content: "Teams Package ", color: Colors.BRIGHT_WHITE },
        { content: zipFileName, color: Colors.BRIGHT_MAGENTA },
        { content: " built successfully!", color: Colors.BRIGHT_WHITE },
      ];
      if (context.platform === Platform.VS) {
        context.logProvider?.info(builtSuccess);
      } else {
        context.ui?.showMessage("info", builtSuccess, false);
      }
    } else if (context.platform === Platform.VSCode) {
      const isWindows = process.platform === "win32";
      let builtSuccess = getLocalizedString(
        "plugins.appstudio.buildSucceedNotice.fallback",
        zipFileName
      );
      if (isWindows) {
        const folderLink = pathToFileURL(path.dirname(zipFileName));
        const appPackageLink = `${VSCodeExtensionCommand.openFolder}?%5B%22${folderLink}%22%5D`;
        builtSuccess = getLocalizedString("plugins.appstudio.buildSucceedNotice", appPackageLink);
      }
      context.ui?.showMessage("info", builtSuccess, false);
    }

    return ok(new Map([["TEAMS_APP_PACKAGE_PATH", zipFileName]]));
  }

  private loadCurrentState() {
    return {
      TAB_ENDPOINT: process.env.TAB_ENDPOINT,
      TAB_DOMAIN: process.env.TAB_DOMAIN,
      BOT_ID: process.env.BOT_ID,
      BOT_DOMAIN: process.env.BOT_DOMAIN,
      ENV_NAME: process.env.TEAMSFX_ENV,
    };
  }
}

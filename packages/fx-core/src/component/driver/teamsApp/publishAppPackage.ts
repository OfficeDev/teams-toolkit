// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Result,
  err,
  ok,
  TeamsAppManifest,
  UserCancelError,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { PublishAppPackageArgs } from "./interfaces/PublishAppPackageArgs";
import { AppStudioClient } from "../../resource/appManifest/appStudioClient";
import { Constants } from "../../resource/appManifest/constants";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { AppStudioScopes } from "../../../common/tools";

const actionName = "teamsApp/configure";

export class PublishAppPackageDriver implements StepDriver {
  public async run(
    args: PublishAppPackageArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    if (!(await fs.pathExists(args.appPackagePath))) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(args.appPackagePath)
        )
      );
    }
    const archivedFile = await fs.readFile(args.appPackagePath);

    const zipEntries = new AdmZip(archivedFile).getEntries();

    const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
    if (!manifestFile) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(Constants.MANIFEST_FILE)
        )
      );
    }
    const manifestString = manifestFile.getData().toString();
    const manifest = JSON.parse(manifestString) as TeamsAppManifest;

    // manifest.id === externalID
    const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const existApp = await AppStudioClient.getAppByTeamsAppId(manifest.id, appStudioTokenRes.value);
    if (existApp) {
      let executePublishUpdate = false;
      let description = `The app ${existApp.displayName} has already been submitted to tenant App Catalog.\nStatus: ${existApp.publishingState}\n`;
      if (existApp.lastModifiedDateTime) {
        description =
          description + `Last Modified: ${existApp.lastModifiedDateTime?.toLocaleString()}\n`;
      }
      description = description + "Do you want to submit a new update?";
      const res = await context.ui?.showMessage("warn", description, true, "Confirm");
      if (res?.isOk() && res.value === "Confirm") executePublishUpdate = true;

      if (executePublishUpdate) {
        const appId = await AppStudioClient.publishTeamsAppUpdate(
          manifest.id,
          archivedFile,
          appStudioTokenRes.value
        );
        const result = new Map([
          ["publishedAppId", appId],
          ["appName", manifest.name.short],
          ["update", "true"],
        ]);
        return ok(result);
      } else {
        return err(UserCancelError);
      }
    } else {
      const appId = await AppStudioClient.publishTeamsApp(
        manifest.id,
        archivedFile,
        appStudioTokenRes.value
      );
      const result = new Map([
        ["publishedAppId", appId],
        ["appName", manifest.name.short],
        ["update", "false"],
      ]);
      return ok(result);
    }
  }
}

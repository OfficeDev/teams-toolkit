// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  Result,
  err,
  ok,
  TeamsAppManifest,
  UserCancelError,
  Platform,
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import { hooks } from "@feathersjs/hooks/lib";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { PublishAppPackageArgs } from "./interfaces/PublishAppPackageArgs";
import { AppStudioClient } from "../../resource/appManifest/appStudioClient";
import { Constants } from "../../resource/appManifest/constants";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { TelemetryPropertyKey } from "../../resource/appManifest/utils/telemetry";
import { AppStudioScopes } from "../../../common/tools";
import { getLocalizedString } from "../../../common/localizeUtils";

const actionName = "teamsApp/configure";

const outputKeys = {
  publishedAppId: "TEAMS_APP_PUBLISHED_APP_ID",
};

export class PublishAppPackageDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
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

    let result;
    const telemetryProps: { [key: string]: string } = {};

    const existApp = await AppStudioClient.getAppByTeamsAppId(manifest.id, appStudioTokenRes.value);
    if (existApp) {
      let executePublishUpdate = false;
      let description = getLocalizedString(
        "plugins.appstudio.pubWarn",
        existApp.displayName,
        existApp.publishingState
      );
      if (existApp.lastModifiedDateTime) {
        description =
          description +
          getLocalizedString(
            "plugins.appstudio.lastModified",
            existApp.lastModifiedDateTime?.toLocaleString()
          );
      }
      description = description + getLocalizedString("plugins.appstudio.updatePublihsedAppConfirm");
      const confirm = getLocalizedString("core.option.confirm");
      const res = await context.ui?.showMessage("warn", description, true, confirm);
      if (res?.isOk() && res.value === confirm) executePublishUpdate = true;

      if (executePublishUpdate) {
        const appId = await AppStudioClient.publishTeamsAppUpdate(
          manifest.id,
          archivedFile,
          appStudioTokenRes.value
        );
        result = new Map([[outputKeys.publishedAppId, appId]]);
        // TODO: how to send telemetry with own properties
        telemetryProps[TelemetryPropertyKey.updateExistingApp] = "true";
      } else {
        return err(UserCancelError);
      }
    } else {
      const appId = await AppStudioClient.publishTeamsApp(
        manifest.id,
        archivedFile,
        appStudioTokenRes.value
      );
      result = new Map([["publishedAppId", appId]]);
      telemetryProps[TelemetryPropertyKey.updateExistingApp] = "false";
    }

    context.logProvider.info(`Publish success!`);
    if (context.platform === Platform.CLI) {
      const msg = getLocalizedString(
        "plugins.appstudio.publishSucceedNotice.cli",
        manifest.name.short,
        Constants.TEAMS_ADMIN_PORTAL,
        Constants.TEAMS_MANAGE_APP_DOC
      );
      context.ui?.showMessage("info", msg, false);
    } else {
      const msg = getLocalizedString(
        "plugins.appstudio.publishSucceedNotice",
        manifest.name.short,
        Constants.TEAMS_MANAGE_APP_DOC
      );
      const adminPortal = getLocalizedString("plugins.appstudio.adminPortal");
      context.ui?.showMessage("info", msg, false, adminPortal).then((value) => {
        if (value.isOk() && value.value === adminPortal) {
          context.ui?.openUrl(Constants.TEAMS_ADMIN_PORTAL);
        }
      });
    }
    return ok(result);
  }
}

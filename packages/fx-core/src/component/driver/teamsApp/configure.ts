// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok, Platform } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { hooks } from "@feathersjs/hooks/lib";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { ConfigureTeamsAppArgs } from "./interfaces/ConfigureTeamsAppArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { AppStudioClient } from "../../resource/appManifest/appStudioClient";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { AppStudioScopes } from "../../../common/tools";
import { getLocalizedString } from "../../../common/localizeUtils";
import { Service } from "typedi";
import { getAbsolutePath } from "../../utils/common";

export const actionName = "teamsApp/update";

const outputNames = {
  TEAMS_APP_ID: "TEAMS_APP_ID",
  TEAMS_APP_TENANT_ID: "TEAMS_APP_TENANT_ID",
};

@Service(actionName)
export class ConfigureTeamsAppDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: ConfigureTeamsAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;
    const appPackagePath = getAbsolutePath(args.appPackagePath, context.projectPath);
    if (!(await fs.pathExists(appPackagePath))) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(args.appPackagePath)
        )
      );
    }
    const archivedFile = await fs.readFile(appPackagePath);

    const progressHandler = context.ui?.createProgressBar(
      getLocalizedString("driver.teamsApp.progressBar.updateTeamsAppTitle"),
      1
    );
    progressHandler?.start();

    try {
      progressHandler?.next(
        getLocalizedString("driver.teamsApp.progressBar.updateTeamsAppStepMessage")
      );

      const appDefinition = await AppStudioClient.importApp(
        archivedFile,
        appStudioToken,
        context.logProvider,
        true
      );
      const message = getLocalizedString(
        "plugins.appstudio.teamsAppUpdatedLog",
        appDefinition.teamsAppId!
      );
      context.logProvider.info(message);
      if (context.platform === Platform.VSCode) {
        context.ui?.showMessage("info", message, false);
      }
      progressHandler?.end(true);
      return ok(
        new Map([
          [outputNames.TEAMS_APP_ID, appDefinition.teamsAppId!],
          [outputNames.TEAMS_APP_TENANT_ID, appDefinition.tenantId!],
        ])
      );
    } catch (e: any) {
      progressHandler?.end(false);
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppUpdateFailedError.name,
          AppStudioError.TeamsAppUpdateFailedError.message(e)
        )
      );
    }
  }
}

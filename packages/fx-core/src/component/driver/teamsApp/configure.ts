// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
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

const actionName = "teamsApp/update";

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

    if (!(await fs.pathExists(args.appPackagePath))) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(args.appPackagePath)
        )
      );
    }
    const archivedFile = await fs.readFile(args.appPackagePath);

    try {
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
      context.ui?.showMessage("info", message, false);
      return ok(
        new Map([
          [outputNames.TEAMS_APP_ID, appDefinition.teamsAppId!],
          [outputNames.TEAMS_APP_TENANT_ID, appDefinition.tenantId!],
        ])
      );
    } catch (e: any) {
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppUpdateFailedError.name,
          AppStudioError.TeamsAppUpdateFailedError.message(e)
        )
      );
    }
  }
}

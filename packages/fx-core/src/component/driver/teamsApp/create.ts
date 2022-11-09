// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  TeamsAppManifest,
  UserError,
  SystemError,
  FxError,
  Result,
  err,
  ok,
  Platform,
} from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { CreateTeamsAppArgs } from "./interfaces/CreateTeamsAppArgs";
import { AppStudioClient } from "../../resource/appManifest/appStudioClient";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { AppStudioScopes } from "../../../common/tools";
import { getLocalizedString } from "../../../common/localizeUtils";
import { Service } from "typedi";
import { AppDefinition } from "../../resource/appManifest/interfaces/appDefinition";

const actionName = "teamsApp/create";

const outputNames = {
  TEAMS_APP_ID: "TEAMS_APP_ID",
  TEAMS_APP_TENANT_ID: "TEAMS_APP_TENANT_ID",
};

@Service(actionName)
export class CreateTeamsAppDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: CreateTeamsAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;

    const appDefinition: AppDefinition = {
      appName: args.appName,
      shortName: args.appName,
      packageName: "com.package.name",
      version: "1.0.0",
      colorIcon: "/images/default-app-icons/color_192x192.png",
      outlineIcon: "/images/default-app-icons/outline_32x32.png",
    };

    try {
      const createdAppDefinition = await AppStudioClient.createApp(appDefinition, appStudioToken);
      const message = getLocalizedString(
        "plugins.appstudio.teamsAppCreatedNotice",
        createdAppDefinition.teamsAppId!
      );
      context.logProvider.info(message);
      if (context.platform === Platform.VSCode) {
        context.ui?.showMessage("info", message, false);
      }
      return ok(
        new Map([
          [outputNames.TEAMS_APP_ID, createdAppDefinition.teamsAppId!],
          [outputNames.TEAMS_APP_TENANT_ID, createdAppDefinition.tenantId!],
        ])
      );
    } catch (e: any) {
      if (e instanceof UserError || e instanceof SystemError) {
        return err(e);
      } else {
        const error = AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppCreateFailedError.name,
          AppStudioError.TeamsAppCreateFailedError.message(e)
        );
        return err(error);
      }
    }
  }
}

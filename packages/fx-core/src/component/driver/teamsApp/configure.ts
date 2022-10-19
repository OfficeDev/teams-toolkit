// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { ConfigureTeamsAppArgs } from "./interfaces/ConfigureTeamsAppArgs";
import { AppStudioClient } from "../../resource/appManifest/appStudioClient";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { AppStudioScopes } from "../../../common/tools";
import { getLocalizedString } from "../../../common/localizeUtils";

const actionName = "teamsApp/configure";

export class ConfigureTeamsAppDriver implements StepDriver {
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
      context.logProvider.info(
        getLocalizedString("plugins.appstudio.teamsAppUpdatedLog", appDefinition.teamsAppId!)
      );
      return ok(new Map([["teamsAppId", appDefinition.teamsAppId!]]));
    } catch (e: any) {
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppCreateFailedError.name,
          AppStudioError.TeamsAppCreateFailedError.message(e)
        )
      );
    }
  }
}

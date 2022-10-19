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
} from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import { hooks } from "@feathersjs/hooks/lib";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { CreateAppPackageDriver } from "./createAppPackage";
import { CreateTeamsAppArgs } from "./interfaces/CreateTeamsAppArgs";
import { AppStudioClient } from "../../resource/appManifest/appStudioClient";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { Constants } from "../../resource/appManifest/constants";
import { AppStudioScopes } from "../../../common/tools";
import { getLocalizedString } from "../../../common/localizeUtils";

const actionName = "teamsApp/create";

const outputNames = {
  TEAMS_APP_ID: "TEAMS_APP_ID",
};

export class CreateTeamsAppDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: CreateTeamsAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const state = this.loadCurrentState();
    let create = true;

    const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;

    const createAppPackageDriver = new CreateAppPackageDriver();
    const result = await createAppPackageDriver.run(
      {
        manifestTemplatePath: args.manifestTemplatePath,
        outputZipPath: `${context.projectPath}/build/appPackage/appPackage.${state.ENV_NAME}.zip`,
        outputJsonPath: `${context.projectPath}/build/appPackage/manifest.${state.ENV_NAME}.json`,
      },
      context
    );
    if (result.isErr()) {
      return result;
    }

    const appPackagePath = result.value.get("TEAMS_APP_PACKAGE_PATH");
    if (!appPackagePath) {
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.InvalidInputError.name,
          AppStudioError.InvalidInputError.message("TEAMS_APP_PACKAGE_PATH", "undefined")
        )
      );
    }
    if (!(await fs.pathExists(appPackagePath))) {
      const error = AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(appPackagePath)
      );
      return err(error);
    }
    const archivedFile = await fs.readFile(appPackagePath);
    const zipEntries = new AdmZip(archivedFile).getEntries();
    const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
    if (!manifestFile) {
      const error = AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(Constants.MANIFEST_FILE)
      );
      return err(error);
    }
    const manifestString = manifestFile.getData().toString();
    const manifest = JSON.parse(manifestString) as TeamsAppManifest;
    const teamsAppId = manifest.id;
    if (teamsAppId) {
      try {
        await AppStudioClient.getApp(teamsAppId, appStudioToken, context.logProvider);
        create = false;
      } catch (error) {}
    }

    if (create) {
      try {
        const appDefinition = await AppStudioClient.importApp(
          archivedFile,
          appStudioTokenRes.value,
          context.logProvider
        );
        const message = getLocalizedString(
          "plugins.appstudio.teamsAppCreatedNotice",
          appDefinition.teamsAppId!
        );
        context.logProvider.info(message);
        context.ui?.showMessage("info", message, false);
        return ok(new Map([[outputNames.TEAMS_APP_ID, appDefinition.teamsAppId!]]));
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
    } else {
      return ok(new Map([[outputNames.TEAMS_APP_ID, teamsAppId]]));
    }
  }

  private loadCurrentState() {
    return {
      ENV_NAME: process.env.TEAMSFX_ENV,
    };
  }
}

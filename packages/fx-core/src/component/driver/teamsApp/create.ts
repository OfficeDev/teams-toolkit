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
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { CreateTeamsAppArgs } from "./interfaces/CreateTeamsAppArgs";
import { AppStudioClient } from "../../resource/appManifest/appStudioClient";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { Constants } from "../../resource/appManifest/constants";
import { AppStudioScopes } from "../../../common/tools";
import { getLocalizedString } from "../../../common/localizeUtils";

const actionName = "teamsApp/create";

export class CreateTeamsAppDriver implements StepDriver {
  public async run(
    args: CreateTeamsAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    let create = true;

    const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;

    if (!(await fs.pathExists(args.appPackagePath))) {
      const error = AppStudioResultFactory.UserError(
        AppStudioError.FileNotFoundError.name,
        AppStudioError.FileNotFoundError.message(args.appPackagePath)
      );
      return err(error);
    }
    const archivedFile = await fs.readFile(args.appPackagePath);
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
        context.logProvider.info(
          getLocalizedString("plugins.appstudio.teamsAppCreatedNotice", appDefinition.teamsAppId!)
        );
        return ok(new Map([["teamsAppId", appDefinition.teamsAppId!]]));
      } catch (e: any) {
        if (e instanceof UserError || e instanceof SystemError) {
          throw e;
        } else {
          const error = AppStudioResultFactory.SystemError(
            AppStudioError.TeamsAppCreateFailedError.name,
            AppStudioError.TeamsAppCreateFailedError.message(e)
          );
          throw error;
        }
      }
    } else {
      return ok(new Map([["teamsAppId", teamsAppId]]));
    }
  }
}

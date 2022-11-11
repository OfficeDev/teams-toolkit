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
import fs from "fs-extra";
import * as path from "path";
import AdmZip from "adm-zip";
import { v4 } from "uuid";
import { Service } from "typedi";
import { hooks } from "@feathersjs/hooks/lib";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { CreateTeamsAppArgs } from "./interfaces/CreateTeamsAppArgs";
import { AppStudioClient } from "../../resource/appManifest/appStudioClient";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import {
  Constants,
  DEFAULT_COLOR_PNG_FILENAME,
  DEFAULT_OUTLINE_PNG_FILENAME,
  COLOR_TEMPLATE,
  OUTLINE_TEMPLATE,
} from "../../resource/appManifest/constants";
import { AppDefinition } from "../../resource/appManifest/interfaces/appDefinition";
import { AppStudioScopes } from "../../../common/tools";
import { getLocalizedString } from "../../../common/localizeUtils";
import { getTemplatesFolder } from "../../../folder";

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
    let create = true;
    const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;

    let createdAppDefinition: AppDefinition;
    const teamsAppId = process.env.TEAMS_APP_ID;
    if (teamsAppId) {
      try {
        createdAppDefinition = await AppStudioClient.getApp(
          teamsAppId,
          appStudioToken,
          context.logProvider
        );
        create = false;
      } catch (error) {}
    }

    if (create) {
      const manifest = new TeamsAppManifest();
      manifest.name.short = args.name;
      if (teamsAppId) {
        manifest.id = teamsAppId;
      } else {
        manifest.id = v4();
      }

      const zip = new AdmZip();
      zip.addFile(Constants.MANIFEST_FILE, Buffer.from(JSON.stringify(manifest, null, 4)));

      const sourceTemplatesFolder = getTemplatesFolder();
      const defaultColorPath = path.join(sourceTemplatesFolder, COLOR_TEMPLATE);
      const defaultOutlinePath = path.join(sourceTemplatesFolder, OUTLINE_TEMPLATE);

      const colorFile = await fs.readFile(defaultColorPath);
      zip.addFile(DEFAULT_COLOR_PNG_FILENAME, colorFile);

      const outlineFile = await fs.readFile(defaultOutlinePath);
      zip.addFile(DEFAULT_OUTLINE_PNG_FILENAME, outlineFile);

      const archivedFile = zip.toBuffer();

      try {
        createdAppDefinition = await AppStudioClient.importApp(
          archivedFile,
          appStudioTokenRes.value,
          context.logProvider
        );
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
    } else {
      return ok(
        new Map([
          [outputNames.TEAMS_APP_ID, createdAppDefinition!.teamsAppId!],
          [outputNames.TEAMS_APP_TENANT_ID, createdAppDefinition!.tenantId!],
        ])
      );
    }
  }
}

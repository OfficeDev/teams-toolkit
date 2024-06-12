// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  FxError,
  Result,
  SystemError,
  TeamsAppManifest,
  UserError,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import * as path from "path";
import { Service } from "typedi";
import { v4 } from "uuid";
import { AppStudioScopes } from "../../../common/constants";
import { getLocalizedString } from "../../../common/localizeUtils";
import { InvalidActionInputError } from "../../../error/common";
import { getTemplatesFolder } from "../../../folder";
import { AppDefinition } from "../../driver/teamsApp/interfaces/appdefinitions/appDefinition";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { loadStateFromEnv } from "../util/utils";
import { WrapDriverContext } from "../util/wrapUtil";
import { AppStudioClient } from "./clients/appStudioClient";
import {
  COLOR_TEMPLATE,
  Constants,
  DEFAULT_COLOR_PNG_FILENAME,
  DEFAULT_OUTLINE_PNG_FILENAME,
  OUTLINE_TEMPLATE,
} from "./constants";
import { AppStudioError } from "./errors";
import { CreateTeamsAppArgs } from "./interfaces/CreateTeamsAppArgs";
import { AppStudioResultFactory } from "./results";

const actionName = "teamsApp/create";

const defaultOutputNames = {
  teamsAppId: "TEAMS_APP_ID",
};

export const internalOutputNames = {
  teamsAppTenantId: "TEAMS_APP_TENANT_ID",
};

@Service(actionName)
export class CreateTeamsAppDriver implements StepDriver {
  description = getLocalizedString("driver.teamsApp.description.createDriver");
  readonly progressTitle = getLocalizedString(
    "driver.teamsApp.progressBar.createTeamsAppStepMessage"
  );

  public async execute(
    args: CreateTeamsAppArgs,
    context: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.create(args, wrapContext, outputEnvVarNames);
    return {
      result: res,
      summaries: wrapContext.summaries,
    };
  }

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  async create(
    args: CreateTeamsAppArgs,
    context: WrapDriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<Result<Map<string, string>, FxError>> {
    const result = this.validateArgs(args);
    if (result.isErr()) {
      return err(result.error);
    }

    if (!outputEnvVarNames) {
      outputEnvVarNames = new Map(Object.entries(defaultOutputNames));
    }
    outputEnvVarNames = new Map([...outputEnvVarNames, ...Object.entries(internalOutputNames)]);
    const state = loadStateFromEnv(outputEnvVarNames);

    let create = true;
    const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;

    let createdAppDefinition: AppDefinition;
    const teamsAppId = state.teamsAppId;
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
        context.logProvider.verbose(message);
        context.addSummary(message);
        return ok(
          new Map([
            [outputEnvVarNames.get("teamsAppId") as string, createdAppDefinition.teamsAppId!],
            [outputEnvVarNames.get("teamsAppTenantId") as string, createdAppDefinition.tenantId!],
          ])
        );
      } catch (e: any) {
        if (e instanceof UserError || e instanceof SystemError) {
          if (e instanceof UserError && !e.helpLink) {
            e.helpLink = "https://aka.ms/teamsfx-actions/teamsapp-create";
          }
          return err(e);
        } else {
          const error = AppStudioResultFactory.SystemError(
            AppStudioError.TeamsAppCreateFailedError.name,
            AppStudioError.TeamsAppCreateFailedError.message(e),
            "https://aka.ms/teamsfx-actions/teamsapp-create"
          );
          return err(error);
        }
      }
    } else {
      context.addSummary(
        getLocalizedString("driver.teamsApp.summary.createTeamsAppAlreadyExists", teamsAppId)
      );
      context.logProvider.verbose(
        getLocalizedString("driver.teamsApp.summary.createTeamsAppAlreadyExists", teamsAppId)
      );
      return ok(
        new Map([
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          [outputEnvVarNames.get("teamsAppId") as string, createdAppDefinition!.teamsAppId!],
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          [outputEnvVarNames.get("teamsAppTenantId") as string, createdAppDefinition!.tenantId!],
        ])
      );
    }
  }

  private validateArgs(args: CreateTeamsAppArgs): Result<any, FxError> {
    const invalidParams: string[] = [];
    if (!args || !args.name) {
      invalidParams.push("name");
    }
    if (invalidParams.length > 0) {
      return err(
        new InvalidActionInputError(
          actionName,
          invalidParams,
          "https://aka.ms/teamsfx-actions/teamsapp-create"
        )
      );
    } else {
      return ok(undefined);
    }
  }
}

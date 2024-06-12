// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, ManifestUtil, Result, err, ok } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import { merge } from "lodash";
import { Service } from "typedi";
import isUUID from "validator/lib/isUUID";
import { getLocalizedString } from "../../../common/localizeUtils";
import { FileNotFoundError, InvalidActionInputError } from "../../../error/common";
import { getAbsolutePath } from "../../utils/common";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { WrapDriverContext } from "../util/wrapUtil";
import { AppStudioClient } from "./clients/appStudioClient";
import { AppStudioError } from "./errors";
import { ConfigureTeamsAppArgs } from "./interfaces/ConfigureTeamsAppArgs";
import { AppStudioResultFactory } from "./results";
import { manifestUtils } from "./utils/ManifestUtils";
import { AppStudioScopes } from "../../../common/constants";

export const actionName = "teamsApp/update";

export const internalOutputNames = {
  teamsAppUpdateTime: "TEAMS_APP_UPDATE_TIME",
  teamsAppTenantId: "TEAMS_APP_TENANT_ID",
};

@Service(actionName)
export class ConfigureTeamsAppDriver implements StepDriver {
  description = getLocalizedString("driver.teamsApp.description.updateDriver");
  readonly progressTitle = getLocalizedString(
    "driver.teamsApp.progressBar.updateTeamsAppStepMessage"
  );

  public async execute(
    args: ConfigureTeamsAppArgs,
    context: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.update(args, wrapContext, outputEnvVarNames);
    return {
      result: res,
      summaries: wrapContext.summaries,
    };
  }

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  async update(
    args: ConfigureTeamsAppArgs,
    context: WrapDriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<Result<Map<string, string>, FxError>> {
    const result = this.validateArgs(args);
    if (result.isErr()) {
      return err(result.error);
    }

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
        new FileNotFoundError(
          actionName,
          appPackagePath,
          "https://aka.ms/teamsfx-actions/teamsapp-update"
        )
      );
    }
    const archivedFile = await fs.readFile(appPackagePath);

    // Add capabilities to telemetry properties
    const manifest = manifestUtils.extractManifestFromArchivedFile(archivedFile);
    if (manifest.isErr()) {
      return err(manifest.error);
    }

    const manifestTelemetries = ManifestUtil.parseCommonTelemetryProperties(manifest.value);
    merge(context.telemetryProperties, manifestTelemetries);

    // Fail if Teams app not exists, as this action only update the Teams app, not create
    // See work item 17187087
    const teamsAppId = manifest.value.id;
    if (!isUUID(teamsAppId)) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.InvalidTeamsAppIdError.name,
          AppStudioError.InvalidTeamsAppIdError.message(teamsAppId),
          "https://aka.ms/teamsfx-actions/teamsapp-update"
        )
      );
    }
    try {
      await AppStudioClient.getApp(teamsAppId, appStudioToken, context.logProvider);
    } catch (error) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.TeamsAppNotExistsError.name,
          AppStudioError.TeamsAppNotExistsError.message(teamsAppId),
          "https://aka.ms/teamsfx-actions/teamsapp-update"
        )
      );
    }

    try {
      let message = getLocalizedString("driver.teamsApp.progressBar.updateTeamsAppStepMessage");

      const appDefinition = await AppStudioClient.importApp(
        archivedFile,
        appStudioToken,
        context.logProvider,
        true
      );
      message = getLocalizedString(
        "plugins.appstudio.teamsAppUpdatedLog",
        appDefinition.teamsAppId!
      );
      context.logProvider.verbose(message);
      context.addSummary(message);
      return ok(
        new Map([
          [internalOutputNames.teamsAppTenantId, appDefinition.tenantId!],
          [internalOutputNames.teamsAppUpdateTime, appDefinition.updatedAt!],
        ])
      );
    } catch (e: any) {
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppUpdateFailedError.name,
          AppStudioError.TeamsAppUpdateFailedError.message(teamsAppId, e),
          "https://aka.ms/teamsfx-actions/teamsapp-update"
        )
      );
    }
  }

  private validateArgs(args: ConfigureTeamsAppArgs): Result<any, FxError> {
    const invalidParams: string[] = [];
    if (!args || !args.appPackagePath) {
      invalidParams.push("appPackagePath");
    }
    if (invalidParams.length > 0) {
      return err(
        new InvalidActionInputError(
          actionName,
          invalidParams,
          "https://aka.ms/teamsfx-actions/teamsapp-update"
        )
      );
    } else {
      return ok(undefined);
    }
  }
}

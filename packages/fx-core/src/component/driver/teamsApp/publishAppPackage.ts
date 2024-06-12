// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Platform, Result, TeamsAppManifest, err, ok } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import { merge } from "lodash";
import { Service } from "typedi";
import { getLocalizedString } from "../../../common/localizeUtils";
import { FileNotFoundError, InvalidActionInputError, UserCancelError } from "../../../error/common";
import { getAbsolutePath } from "../../utils/common";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { WrapDriverContext } from "../util/wrapUtil";
import { AppStudioClient } from "./clients/appStudioClient";
import { Constants } from "./constants";
import { PublishAppPackageArgs } from "./interfaces/PublishAppPackageArgs";
import { TelemetryPropertyKey } from "./utils/telemetry";
import { AppStudioScopes } from "../../../common/constants";

export const actionName = "teamsApp/publishAppPackage";

const defaultOutputNames = {
  publishedAppId: "TEAMS_APP_PUBLISHED_APP_ID",
};

@Service(actionName)
export class PublishAppPackageDriver implements StepDriver {
  description = getLocalizedString("driver.teamsApp.description.publishDriver");
  readonly progressTitle = getLocalizedString("driver.teamsApp.progressBar.publishTeamsAppStep2.2");

  public async execute(
    args: PublishAppPackageArgs,
    context: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.publish(args, wrapContext, outputEnvVarNames);
    return {
      result: res,
      summaries: wrapContext.summaries,
    };
  }

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async publish(
    args: PublishAppPackageArgs,
    context: WrapDriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<Result<Map<string, string>, FxError>> {
    const argsValidationResult = this.validateArgs(args);
    if (argsValidationResult.isErr()) {
      return err(argsValidationResult.error);
    }

    if (!outputEnvVarNames) {
      outputEnvVarNames = new Map(Object.entries(defaultOutputNames));
    }

    const appPackagePath = getAbsolutePath(args.appPackagePath, context.projectPath);
    if (!(await fs.pathExists(appPackagePath))) {
      return err(
        new FileNotFoundError(
          actionName,
          appPackagePath,
          "https://aka.ms/teamsfx-actions/teamsapp-publish"
        )
      );
    }
    const archivedFile = await fs.readFile(appPackagePath);

    const zipEntries = new AdmZip(archivedFile).getEntries();

    const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
    if (!manifestFile) {
      return err(
        new FileNotFoundError(
          actionName,
          Constants.MANIFEST_FILE,
          "https://aka.ms/teamsfx-actions/teamsapp-publish"
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

    const message = getLocalizedString("driver.teamsApp.progressBar.publishTeamsAppStep1");
    context.addSummary(message);

    try {
      const existApp = await AppStudioClient.getAppByTeamsAppId(
        manifest.id,
        appStudioTokenRes.value
      );
      if (existApp) {
        context.addSummary(
          getLocalizedString("driver.teamsApp.summary.publishTeamsAppExists", manifest.id)
        );
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
        description =
          description + getLocalizedString("plugins.appstudio.updatePublihsedAppConfirm");
        const confirm = getLocalizedString("core.option.confirm");
        const res = await context.ui?.showMessage("warn", description, true, confirm);
        if (res?.isOk() && res.value === confirm) executePublishUpdate = true;

        if (executePublishUpdate) {
          const message = getLocalizedString("driver.teamsApp.progressBar.publishTeamsAppStep2.1");
          context.addSummary(message);
          context.logProvider.debug(message);
          const appId = await AppStudioClient.publishTeamsAppUpdate(
            manifest.id,
            archivedFile,
            appStudioTokenRes.value
          );
          result = new Map([[outputEnvVarNames.get("publishedAppId") as string, appId]]);
          merge(context.telemetryProperties, {
            [TelemetryPropertyKey.updateExistingApp]: "true",
            [TelemetryPropertyKey.publishedAppId]: appId,
          });
        } else {
          return err(new UserCancelError(actionName));
        }
      } else {
        context.addSummary(
          getLocalizedString("driver.teamsApp.summary.publishTeamsAppNotExists", manifest.id)
        );
        const message = getLocalizedString("driver.teamsApp.progressBar.publishTeamsAppStep2.2");
        context.addSummary(message);
        context.logProvider.debug(message);
        const appId = await AppStudioClient.publishTeamsApp(
          manifest.id,
          archivedFile,
          appStudioTokenRes.value
        );
        result = new Map([[outputEnvVarNames.get("publishedAppId") as string, appId]]);
        merge(context.telemetryProperties, {
          [TelemetryPropertyKey.updateExistingApp]: "false",
        });
      }
    } catch (e: any) {
      return err(e);
    }

    context.logProvider.info(`Publish success!`);
    context.addSummary(
      getLocalizedString("driver.teamsApp.summary.publishTeamsAppSuccess", manifest.id)
    );
    if (context.platform === Platform.CLI) {
      const msg = getLocalizedString(
        "plugins.appstudio.publishSucceedNotice.cli",
        manifest.name.short,
        Constants.TEAMS_ADMIN_PORTAL,
        Constants.TEAMS_MANAGE_APP_DOC
      );
      context.ui?.showMessage("info", msg, false);
    }
    return ok(result);
  }

  private validateArgs(args: PublishAppPackageArgs): Result<any, FxError> {
    const invalidParams: string[] = [];
    if (!args || !args.appPackagePath) {
      invalidParams.push("appPackagePath");
    }
    if (invalidParams.length > 0) {
      return err(
        new InvalidActionInputError(
          actionName,
          invalidParams,
          "https://aka.ms/teamsfx-actions/teamsapp-publish"
        )
      );
    } else {
      return ok(undefined);
    }
  }
}

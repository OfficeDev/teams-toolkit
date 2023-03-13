// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, err, ok, Platform, TeamsAppManifest } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import { hooks } from "@feathersjs/hooks/lib";
import { merge } from "lodash";
import { StepDriver, ExecutionResult } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { WrapDriverContext } from "../util/wrapUtil";
import { ConfigureTeamsAppArgs } from "./interfaces/ConfigureTeamsAppArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { AppStudioClient } from "../../resource/appManifest/appStudioClient";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { Constants } from "../../resource/appManifest/constants";
import { TelemetryUtils } from "../../resource/appManifest/utils/telemetry";
import { manifestUtils } from "../../resource/appManifest/utils/ManifestUtils";
import { AppStudioError } from "../../resource/appManifest/errors";
import { AppStudioScopes } from "../../../common/tools";
import { getLocalizedString } from "../../../common/localizeUtils";
import { TelemetryProperty } from "../../../common/telemetry";
import { Service } from "typedi";
import { getAbsolutePath } from "../../utils/common";
import { FileNotFoundError, InvalidActionInputError } from "../../../error/common";

export const actionName = "teamsApp/update";

export const outputNames = {
  TEAMS_APP_ID: "TEAMS_APP_ID",
  TEAMS_APP_TENANT_ID: "TEAMS_APP_TENANT_ID",
  TEAMS_APP_UPDATE_TIME: "TEAMS_APP_UPDATE_TIME",
};

@Service(actionName)
export class ConfigureTeamsAppDriver implements StepDriver {
  description = getLocalizedString("driver.teamsApp.description.updateDriver");

  public async run(
    args: ConfigureTeamsAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.update(args, wrapContext);
    return res;
  }

  public async execute(
    args: ConfigureTeamsAppArgs,
    context: DriverContext
  ): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.update(args, wrapContext);
    return {
      result: res,
      summaries: wrapContext.summaries,
    };
  }

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  async update(
    args: ConfigureTeamsAppArgs,
    context: WrapDriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    TelemetryUtils.init(context);

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
    const capabilities = this.extractCapabilties(archivedFile);
    if (capabilities.isOk()) {
      merge(context.telemetryProperties, {
        [TelemetryProperty.Capabilities]: capabilities.value.join(";"),
      });
    } else {
      return err(capabilities.error);
    }

    const progressHandler = context.ui?.createProgressBar(
      getLocalizedString("driver.teamsApp.progressBar.updateTeamsAppTitle"),
      1
    );
    progressHandler?.start();

    try {
      let message = getLocalizedString("driver.teamsApp.progressBar.updateTeamsAppStepMessage");
      progressHandler?.next(message);

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
      context.logProvider.info(message);
      context.addSummary(message);
      if (context.platform === Platform.VSCode) {
        context.ui?.showMessage("info", message, false);
      }
      progressHandler?.end(true);
      return ok(
        new Map([
          [outputNames.TEAMS_APP_ID, appDefinition.teamsAppId!],
          [outputNames.TEAMS_APP_TENANT_ID, appDefinition.tenantId!],
          [outputNames.TEAMS_APP_UPDATE_TIME, appDefinition.updatedAt!],
        ])
      );
    } catch (e: any) {
      progressHandler?.end(false);
      return err(
        AppStudioResultFactory.SystemError(
          AppStudioError.TeamsAppUpdateFailedError.name,
          AppStudioError.TeamsAppUpdateFailedError.message(e),
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

  /**
   * Extract capabilities from zip file
   */
  private extractCapabilties(archivedFile: Buffer): Result<string[], FxError> {
    const zipEntries = new AdmZip(archivedFile).getEntries();
    const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
    if (!manifestFile) {
      return err(new FileNotFoundError(actionName, Constants.MANIFEST_FILE));
    }
    const manifestString = manifestFile.getData().toString();
    const manifest = JSON.parse(manifestString) as TeamsAppManifest;
    const capabilities = manifestUtils._getCapabilities(manifest);
    // Mapping to Tab
    const result = capabilities.map((x) => {
      if (x == "staticTab" || x == "configurableTab") {
        return "Tab";
      } else {
        return x;
      }
    });
    return ok([...new Set(result)]);
  }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, ok, err, TeamsAppManifest, ManifestUtil } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { Service } from "typedi";
import fs from "fs-extra";
import * as path from "path";
import { merge } from "lodash";
import { StepDriver, ExecutionResult } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { WrapDriverContext } from "../util/wrapUtil";
import { ValidateWithTestCasesArgs } from "./interfaces/ValidateWithTestCasesArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { AppStudioClient } from "./clients/appStudioClient";
import { getLocalizedString } from "../../../common/localizeUtils";
import { AppStudioScopes, waitSeconds } from "../../../common/tools";
import AdmZip from "adm-zip";
import {
  Constants,
  getAppStudioEndpoint,
  CEHCK_VALIDATION_RESULTS_INTERVAL_SECONDS,
} from "./constants";
import { metadataUtil } from "../../utils/metadataUtil";
import { FileNotFoundError, InvalidActionInputError } from "../../../error/common";
import {
  AsyncAppValidationResponse,
  AsyncAppValidationStatus,
} from "./interfaces/AsyncAppValidationResponse";
import { AsyncAppValidationResultsResponse } from "./interfaces/AsyncAppValidationResultsResponse";

const actionName = "teamsApp/validateWithTestCases";

@Service(actionName)
export class ValidateWithTestCasesDriver implements StepDriver {
  description = getLocalizedString(
    "core.selectValidateMethodQuestion.validate.testCasesOptionDescription"
  );
  readonly progressTitle = getLocalizedString("driver.teamsApp.progressBar.validateWithTestCases");

  public async execute(
    args: ValidateWithTestCasesArgs,
    context: DriverContext
  ): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.validate(args, wrapContext);
    return {
      result: res,
      summaries: wrapContext.summaries,
    };
  }

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async validate(
    args: ValidateWithTestCasesArgs,
    context: WrapDriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const result = this.validateArgs(args);
    if (result.isErr()) {
      return err(result.error);
    }

    let appPackagePath = args.appPackagePath;
    if (!path.isAbsolute(appPackagePath)) {
      appPackagePath = path.join(context.projectPath, appPackagePath);
    }
    if (!(await fs.pathExists(appPackagePath))) {
      return err(new FileNotFoundError(actionName, appPackagePath));
    }

    const archivedFile = await fs.readFile(appPackagePath);

    const zipEntries = new AdmZip(archivedFile).getEntries();
    const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
    if (manifestFile) {
      const manifestContent = manifestFile.getData().toString();
      const manifest = JSON.parse(manifestContent) as TeamsAppManifest;
      metadataUtil.parseManifest(manifest);

      // Add common properties like isCopilotPlugin: boolean
      const manifestTelemetries = ManifestUtil.parseCommonTelemetryProperties(manifest);
      merge(context.telemetryProperties, manifestTelemetries);

      const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (appStudioTokenRes.isErr()) {
        return err(appStudioTokenRes.error);
      }
      const appStudioToken = appStudioTokenRes.value;

      const response: AsyncAppValidationResponse | AsyncAppValidationResultsResponse =
        await AppStudioClient.submitAppValidationRequest(manifest.id, appStudioToken);

      const message = getLocalizedString(
        "driver.teamsApp.progressBar.validateWithTestCases.step",
        response.status,
        `${getAppStudioEndpoint()}/apps/${manifest.id}/app-validation`
      );
      context.logProvider.info(message);

      // Do not await the final validation result, return immediately
      void this.runningBackgroundJob(args, context, appStudioToken, response, manifest.id);
      return ok(new Map());
    } else {
      return err(new FileNotFoundError(actionName, "manifest.json"));
    }
  }

  /**
   * Periodically check the result until it's completed or aborted
   * @param args
   * @param context
   * @param appStudioToken
   * @param response
   * @param teamsAppId
   */
  private async runningBackgroundJob(
    args: ValidateWithTestCasesArgs,
    context: WrapDriverContext,
    appStudioToken: string,
    response: AsyncAppValidationResponse | AsyncAppValidationResultsResponse,
    teamsAppId: string
  ): Promise<void> {
    const validationStatusUrl = `${getAppStudioEndpoint()}/apps/${teamsAppId}/app-validation/${
      response.appValidationId
    }`;
    const validationRequestListUrl = `${getAppStudioEndpoint()}/apps/${teamsAppId}/app-validation`;

    try {
      if (args.showProgressBar && context.ui) {
        context.progressBar = context.ui.createProgressBar(this.progressTitle, 1);
        await context.progressBar.start();

        const message = getLocalizedString(
          "driver.teamsApp.progressBar.validateWithTestCases.step",
          response.status,
          validationRequestListUrl
        );
        await context.progressBar.next(message);
      }

      while (
        response.status !== AsyncAppValidationStatus.Completed &&
        response.status !== AsyncAppValidationStatus.Aborted
      ) {
        await waitSeconds(CEHCK_VALIDATION_RESULTS_INTERVAL_SECONDS);
        const message = getLocalizedString(
          "driver.teamsApp.progressBar.validateWithTestCases.step",
          response.status,
          validationRequestListUrl
        );
        context.logProvider.info(message);
        response = await AppStudioClient.getAppValidationById(
          response.appValidationId,
          appStudioToken
        );
      }

      if (response.status === AsyncAppValidationStatus.Completed) {
        if (args.showMessage && context.ui) {
          void context.ui
            .showMessage(
              "info",
              getLocalizedString("driver.teamsApp.summary.validateWithTestCases", response.status),
              false,
              getLocalizedString("driver.teamsApp.summary.validateWithTestCases.viewResult")
            )
            .then(async (res) => {
              if (
                res.isOk() &&
                res.value ===
                  getLocalizedString("driver.teamsApp.summary.validateWithTestCases.viewResult")
              ) {
                await context.ui?.openUrl(validationStatusUrl);
              }
            });
        }
        context.logProvider.info(
          getLocalizedString(
            "driver.teamsApp.summary.validateWithTestCases",
            response.status,
            validationStatusUrl
          )
        );
      } else {
        if (args.showMessage && context.ui) {
          void context.ui
            .showMessage(
              "error",
              getLocalizedString(
                "driver.teamsApp.summary.validateWithTestCases.result",
                response.status
              ),
              false,
              getLocalizedString("driver.teamsApp.summary.validateWithTestCases.viewResult")
            )
            .then(async (res) => {
              if (
                res.isOk() &&
                res.value ===
                  getLocalizedString("driver.teamsApp.summary.validateWithTestCases.viewResult")
              ) {
                await context.ui?.openUrl(validationStatusUrl);
              }
            });
        }
        context.logProvider.error(
          getLocalizedString(
            "driver.teamsApp.summary.validateWithTestCases",
            response.status,
            validationStatusUrl
          )
        );
      }
    } finally {
      if (args.showProgressBar && context.progressBar) {
        await context.progressBar.end(true);
      }
    }
  }

  private validateArgs(args: ValidateWithTestCasesArgs): Result<any, FxError> {
    if (!args || !args.appPackagePath) {
      return err(new InvalidActionInputError(actionName, ["appPackagePath"]));
    }
    return ok(undefined);
  }
}

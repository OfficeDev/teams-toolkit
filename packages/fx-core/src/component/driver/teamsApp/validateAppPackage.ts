// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ning Liu <nliu@microsoft.com>
 */

import {
  Result,
  FxError,
  ok,
  err,
  TeamsAppManifest,
  Platform,
  Colors,
} from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { Service } from "typedi";
import fs from "fs-extra";
import * as path from "path";
import { EOL } from "os";
import { StepDriver, ExecutionResult } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { WrapDriverContext } from "../util/wrapUtil";
import { ValidateAppPackageArgs } from "./interfaces/ValidateAppPackageArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { TelemetryUtils } from "../../resource/appManifest/utils/telemetry";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { AppStudioClient } from "../../resource/appManifest/appStudioClient";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { AppStudioScopes } from "../../../common/tools";
import AdmZip from "adm-zip";
import { Constants } from "../../resource/appManifest/constants";
import { metadataUtil } from "../../utils/metadataUtil";

const actionName = "teamsApp/validateAppPackage";

@Service(actionName)
export class ValidateAppPackageDriver implements StepDriver {
  description = getLocalizedString("driver.teamsApp.description.validateDriver");

  public async run(
    args: ValidateAppPackageArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.validate(args, wrapContext);
    return res;
  }

  public async execute(
    args: ValidateAppPackageArgs,
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
    args: ValidateAppPackageArgs,
    context: WrapDriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    TelemetryUtils.init(context);
    const result = this.validateArgs(args);
    if (result.isErr()) {
      return err(result.error);
    }

    let appPackagePath = args.appPackagePath;
    if (!path.isAbsolute(appPackagePath)) {
      appPackagePath = path.join(context.projectPath, appPackagePath);
    }
    if (!(await fs.pathExists(appPackagePath))) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.FileNotFoundError.name,
          AppStudioError.FileNotFoundError.message(appPackagePath)
        )
      );
    }
    const archivedFile = await fs.readFile(appPackagePath);

    const zipEntries = new AdmZip(archivedFile).getEntries();
    const manifestFile = zipEntries.find((x) => x.entryName === Constants.MANIFEST_FILE);
    if (manifestFile) {
      const manifestContent = manifestFile.getData().toString();
      const manifest = JSON.parse(manifestContent) as TeamsAppManifest;
      metadataUtil.parseManifest(manifest);
    }

    const appStudioTokenRes = await context.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;

    try {
      const validationResult = await AppStudioClient.partnerCenterAppPackageValidation(
        archivedFile,
        appStudioToken
      );

      if (context.platform === Platform.CLI) {
        const outputMessage: Array<{ content: string; color: Colors }> = [
          {
            content: "Teams Toolkit has checked against all validation rules:\n\nSummary: \n",
            color: Colors.BRIGHT_WHITE,
          },
          {
            content: `${
              validationResult.errors.length + validationResult.warnings.length
            } failed, `,
            color: Colors.BRIGHT_RED,
          },
          { content: `${validationResult.notes.length} passed.\n`, color: Colors.BRIGHT_GREEN },
        ];
        validationResult.errors.map((error) => {
          outputMessage.push({ content: "(x) Error: ", color: Colors.BRIGHT_RED });
          outputMessage.push({
            content: `${error.content} \n${getLocalizedString("core.option.learnMore")}: `,
            color: Colors.BRIGHT_WHITE,
          });
          outputMessage.push({ content: error.helpUrl, color: Colors.BRIGHT_CYAN });
        });
        context.ui?.showMessage("info", outputMessage, false);
      } else {
        // logs in output window
        const errors = validationResult.errors
          .map((error) => {
            return `(x) Error: ${error.content} \n${getLocalizedString("core.option.learnMore")}: ${
              error.helpUrl
            }`;
          })
          .join(EOL);
        const warnings = validationResult.warnings
          .map((warning) => {
            return `(!) Warning: ${warning.content} \n${getLocalizedString(
              "core.option.learnMore"
            )}: ${warning.helpUrl}`;
          })
          .join(EOL);
        const outputMessage =
          EOL +
          getLocalizedString(
            "driver.teamsApp.summary.validate",
            validationResult.errors.length + validationResult.warnings.length,
            validationResult.notes.length,
            errors,
            warnings,
            undefined
          );
        context.logProvider?.info(outputMessage);
        const message = getLocalizedString(
          "driver.teamsApp.validate.result",
          validationResult.errors.length + validationResult.warnings.length,
          validationResult.notes.length,
          "command:fx-extension.showOutputChannel"
        );
        context.ui?.showMessage("info", message, false);
      }
    } catch (e: any) {
      context.logProvider?.warning(
        getLocalizedString("error.teamsApp.validate.apiFailed", e.message)
      );
      context.ui?.showMessage(
        "warn",
        getLocalizedString(
          "error.teamsApp.validate.apiFailed.display",
          "command:fx-extension.showOutputChannel"
        ),
        false
      );
    }
    return ok(new Map());
  }

  private validateArgs(args: ValidateAppPackageArgs): Result<any, FxError> {
    if (!args || !args.appPackagePath) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.InvalidParameterError.name,
          [
            getDefaultString(
              "driver.teamsApp.validate.invalidParameter",
              "appPackagePath",
              actionName
            ),
            getLocalizedString(
              "driver.teamsApp.validate.invalidParameter",
              "appPackagePath",
              actionName
            ),
          ],
          "https://aka.ms/teamsfx-actions/teamsapp-validate"
        )
      );
    }
    return ok(undefined);
  }
}

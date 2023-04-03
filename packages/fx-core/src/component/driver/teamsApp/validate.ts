// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, ok, err, Platform, ManifestUtil } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { Service } from "typedi";
import { StepDriver, ExecutionResult } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { WrapDriverContext } from "../util/wrapUtil";
import { ValidateManifestArgs } from "./interfaces/ValidateManifestArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { TelemetryUtils } from "../../resource/appManifest/utils/telemetry";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { manifestUtils } from "../../resource/appManifest/utils/ManifestUtils";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { HelpLinks } from "../../../common/constants";
import { getAbsolutePath } from "../../utils/common";
import { updateProgress } from "../middleware/updateProgress";

const actionName = "teamsApp/validateManifest";

@Service(actionName)
export class ValidateManifestDriver implements StepDriver {
  description = getLocalizedString("driver.teamsApp.description.validateDriver");

  public async run(
    args: ValidateManifestArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.validate(args, wrapContext);
    return res;
  }

  public async execute(
    args: ValidateManifestArgs,
    context: DriverContext
  ): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.validate(args, wrapContext);
    return {
      result: res,
      summaries: wrapContext.summaries,
    };
  }

  @hooks([
    addStartAndEndTelemetry(actionName, actionName),
    updateProgress(getLocalizedString("plugins.appstudio.validateManifest.progressBar.message")),
  ])
  public async validate(
    args: ValidateManifestArgs,
    context: WrapDriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    TelemetryUtils.init(context);
    const result = this.validateArgs(args);
    if (result.isErr()) {
      return err(result.error);
    }
    const state = this.loadCurrentState();
    const manifestRes = await manifestUtils.getManifestV3(
      getAbsolutePath(args.manifestPath!, context.projectPath),
      state
    );
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }
    const manifest = manifestRes.value;

    let validationResult;
    if (manifest.$schema) {
      try {
        validationResult = await ManifestUtil.validateManifest(manifest);
      } catch (e: any) {
        return err(
          AppStudioResultFactory.UserError(
            AppStudioError.ValidationFailedError.name,
            AppStudioError.ValidationFailedError.message([
              getLocalizedString(
                "error.appstudio.validateFetchSchemaFailed",
                manifest.$schema,
                e.message
              ),
            ]),
            HelpLinks.WhyNeedProvision
          )
        );
      }
    } else {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.ValidationFailedError.name,
          AppStudioError.ValidationFailedError.message([
            getLocalizedString("error.appstudio.validateSchemaNotDefined"),
          ]),
          HelpLinks.WhyNeedProvision
        )
      );
    }

    if (validationResult.length > 0) {
      const errMessage = AppStudioError.ValidationFailedError.message(validationResult);
      context.logProvider?.error(getLocalizedString("plugins.appstudio.validationFailedNotice"));
      const validationFailed = AppStudioResultFactory.UserError(
        AppStudioError.ValidationFailedError.name,
        errMessage,
        "https://aka.ms/teamsfx-actions/teamsapp-validate"
      );
      return err(validationFailed);
    }
    const validationSuccess = getLocalizedString("plugins.appstudio.validationSucceedNotice");
    if (context.platform === Platform.VS) {
      context.logProvider.info(validationSuccess);
    }
    return ok(new Map());
  }

  private loadCurrentState() {
    return {
      ENV_NAME: process.env.TEAMSFX_ENV,
    };
  }

  private validateArgs(args: ValidateManifestArgs): Result<any, FxError> {
    if (!args || !args.manifestPath) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.InvalidParameterError.name,
          [
            getDefaultString(
              "driver.teamsApp.validate.invalidParameter",
              "manifestPath",
              actionName
            ),
            getLocalizedString(
              "driver.teamsApp.validate.invalidParameter",
              "manifestPath",
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

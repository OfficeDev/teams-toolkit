// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, ok, err, ManifestUtil, Platform } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { Service } from "typedi";
import { StepDriver, ExecutionResult } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { WrapDriverContext } from "../util/wrapUtil";
import { ValidateTeamsAppArgs } from "./interfaces/ValidateTeamsAppArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { manifestUtils } from "../../resource/appManifest/utils/ManifestUtils";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { getLocalizedString } from "../../../common/localizeUtils";
import { HelpLinks } from "../../../common/constants";
import { getAbsolutePath } from "../../utils/common";

const actionName = "teamsApp/validate";

@Service(actionName)
export class ValidateTeamsAppDriver implements StepDriver {
  description = getLocalizedString("driver.teamsApp.description.validateDriver");

  public async run(
    args: ValidateTeamsAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const wrapContext = new WrapDriverContext(context, actionName, actionName);
    const res = await this.validate(args, wrapContext);
    return res;
  }

  public async execute(
    args: ValidateTeamsAppArgs,
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
    args: ValidateTeamsAppArgs,
    context: WrapDriverContext,
    withEmptyCapabilities?: boolean
  ): Promise<Result<Map<string, string>, FxError>> {
    /*const result = this.validateArgs(args);
    if (result.isErr()) {
      return err(result.error);
    }

    const state = this.loadCurrentState();
    const manifestRes = await manifestUtils.getManifestV3(
      getAbsolutePath(args.manifestPath, context.projectPath),
      state,
      withEmptyCapabilities
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
    } else {
      context.ui?.showMessage("info", validationSuccess, false);
    }*/
    return ok(new Map());
  }

  private loadCurrentState() {
    return {
      TAB_ENDPOINT: process.env.TAB_ENDPOINT,
      TAB_DOMAIN: process.env.TAB_DOMAIN,
      BOT_ID: process.env.BOT_ID,
      BOT_DOMAIN: process.env.BOT_DOMAIN,
      ENV_NAME: process.env.TEAMSFX_ENV,
    };
  }

  private validateArgs(args: ValidateTeamsAppArgs): Result<any, FxError> {
    const invalidParams: string[] = [];
    if (!args || !args.manifestPath) {
      invalidParams.push("manifestPath");
    }
    if (invalidParams.length > 0) {
      return err(
        AppStudioResultFactory.UserError(
          AppStudioError.InvalidParameterError.name,
          AppStudioError.InvalidParameterError.message(actionName, invalidParams),
          "https://aka.ms/teamsfx-actions/teamsapp-validate"
        )
      );
    } else {
      return ok(undefined);
    }
  }
}

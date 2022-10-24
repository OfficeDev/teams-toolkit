// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, ok, err, ManifestUtil } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { ValidateTeamsAppArgs } from "./interfaces/ValidateTeamsAppArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { manifestUtils } from "../../resource/appManifest/utils/ManifestUtils";
import { AppStudioResultFactory } from "../../resource/appManifest/results";
import { AppStudioError } from "../../resource/appManifest/errors";
import { getLocalizedString } from "../../../common/localizeUtils";
import { HelpLinks } from "../../../common/constants";

const actionName = "teamsApp/validate";

export class ValidateTeamsAppDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: ValidateTeamsAppArgs,
    context: DriverContext,
    withEmptyCapabilities?: boolean
  ): Promise<Result<Map<string, string>, FxError>> {
    const state = this.loadCurrentState();
    const manifestRes = await manifestUtils.getManifestV3(
      args.manifestTemplatePath,
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
        errMessage
      );
      return err(validationFailed);
    }
    const validationSuccess = getLocalizedString("plugins.appstudio.validationSucceedNotice");
    context.ui?.showMessage("info", validationSuccess, false);
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
}

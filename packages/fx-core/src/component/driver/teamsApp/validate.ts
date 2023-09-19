// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result, FxError, ok, err, Platform, ManifestUtil, Colors } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { Service } from "typedi";
import { EOL } from "os";
import { merge } from "lodash";
import { StepDriver, ExecutionResult } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { WrapDriverContext } from "../util/wrapUtil";
import { ValidateManifestArgs } from "./interfaces/ValidateManifestArgs";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { TelemetryUtils, TelemetryPropertyKey } from "./utils/telemetry";
import { AppStudioResultFactory } from "./results";
import { AppStudioError } from "./errors";
import { manifestUtils } from "./utils/ManifestUtils";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { HelpLinks } from "../../../common/constants";
import { getAbsolutePath } from "../../utils/common";
import { SummaryConstant } from "../../configManager/constant";
import { InvalidActionInputError } from "../../../error/common";

const actionName = "teamsApp/validateManifest";

@Service(actionName)
export class ValidateManifestDriver implements StepDriver {
  description = getLocalizedString("driver.teamsApp.description.validateDriver");
  readonly progressTitle = getLocalizedString(
    "plugins.appstudio.validateManifest.progressBar.message"
  );

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

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async validate(
    args: ValidateManifestArgs,
    context: WrapDriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    TelemetryUtils.init(context);
    const result = this.validateArgs(args);
    if (result.isErr()) {
      return err(result.error);
    }
    const manifestRes = await manifestUtils.getManifestV3(
      getAbsolutePath(args.manifestPath, context.projectPath),
      context
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
      const summaryStr = getLocalizedString(
        "driver.teamsApp.summary.validate.failed",
        validationResult.length
      );

      if (context.platform === Platform.CLI) {
        const outputMessage: Array<{ content: string; color: Colors }> = [
          {
            content: "Teams Toolkit has checked manifest with its schema:\n\nSummary: \n",
            color: Colors.BRIGHT_WHITE,
          },
          {
            content: `${validationResult.length} failed.\n`,
            color: Colors.BRIGHT_RED,
          },
        ];
        validationResult.map((error: string) => {
          outputMessage.push({ content: `${SummaryConstant.Failed} `, color: Colors.BRIGHT_RED });
          outputMessage.push({
            content: `${error}\n`,
            color: Colors.BRIGHT_WHITE,
          });
        });
        context.ui?.showMessage("info", outputMessage, false);
      } else {
        // logs in output window
        const errors = validationResult
          .map((error: string) => {
            return `${SummaryConstant.Failed} ${error}`;
          })
          .join(EOL);
        const outputMessage =
          EOL + getLocalizedString("driver.teamsApp.summary.validateManifest", summaryStr, errors);

        context.logProvider?.info(outputMessage);
      }

      merge(context.telemetryProperties, {
        [TelemetryPropertyKey.validationErrors]: validationResult
          .map((r: string) => r.replace(/\//g, ""))
          .join(";"),
      });

      return err(
        AppStudioResultFactory.UserError(AppStudioError.ValidationFailedError.name, [
          getDefaultString("driver.teamsApp.validate.result", summaryStr),
          getLocalizedString("driver.teamsApp.validate.result.display", summaryStr),
        ])
      );
    } else {
      // logs in output window
      const summaryStr = getLocalizedString(
        "driver.teamsApp.summary.validate.succeed",
        getLocalizedString("driver.teamsApp.summary.validate.all")
      );
      const outputMessage =
        EOL + getLocalizedString("driver.teamsApp.summary.validateManifest", summaryStr, "");
      context.logProvider?.info(outputMessage);

      const validationSuccess = getLocalizedString(
        "driver.teamsApp.validate.result.display",
        summaryStr
      );
      if (context.platform === Platform.VS) {
        context.logProvider.info(validationSuccess);
      }
      if (args.showMessage) {
        if (context.platform === Platform.CLI) {
          const outputMessage: Array<{ content: string; color: Colors }> = [
            {
              content:
                "Teams Toolkit has completed checking your app package against validation rules. " +
                summaryStr +
                ".",
              color: Colors.BRIGHT_GREEN,
            },
          ];
          context.logProvider.info(outputMessage);
        } else {
          context.ui?.showMessage("info", validationSuccess, false);
        }
      }
      return ok(new Map());
    }
  }

  private validateArgs(args: ValidateManifestArgs): Result<any, FxError> {
    if (!args || !args.manifestPath) {
      return err(
        new InvalidActionInputError(
          actionName,
          ["manifestPath"],
          "https://aka.ms/teamsfx-actions/teamsapp-validate"
        )
      );
    }
    return ok(undefined);
  }
}

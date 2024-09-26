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
import { TelemetryPropertyKey } from "./utils/telemetry";
import { AppStudioResultFactory } from "./results";
import { AppStudioError } from "./errors";
import { manifestUtils } from "./utils/ManifestUtils";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { HelpLinks } from "../../../common/constants";
import { getAbsolutePath } from "../../utils/common";
import { SummaryConstant } from "../../configManager/constant";
import { InvalidActionInputError } from "../../../error/common";
import path from "path";
import { copilotGptManifestUtils } from "./utils/CopilotGptManifestUtils";
import { pluginManifestUtils } from "./utils/PluginManifestUtils";

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
    const result = this.validateArgs(args);
    if (result.isErr()) {
      return err(result.error);
    }
    const manifestPath = getAbsolutePath(args.manifestPath, context.projectPath);
    const manifestRes = await manifestUtils.getManifestV3(manifestPath, context);
    if (manifestRes.isErr()) {
      return err(manifestRes.error);
    }
    const manifest = manifestRes.value;

    let manifestValidationResult;
    const telemetryProperties: Record<string, string> = {};
    if (manifest.$schema) {
      try {
        manifestValidationResult = await ManifestUtil.validateManifest(manifest);
        telemetryProperties[TelemetryPropertyKey.validationErrors] = manifestValidationResult
          .map((r: string) => r.replace(/\//g, ""))
          .join(";");
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

    let declarativeCopilotValidationResult;
    let pluginValidationResult;
    let pluginPath = "";
    if (manifest.copilotExtensions || manifest.copilotAgents) {
      // plugin
      const plugins = manifest.copilotExtensions
        ? manifest.copilotExtensions.plugins
        : manifest.copilotAgents!.plugins;
      if (plugins?.length && plugins[0].file) {
        pluginPath = path.join(path.dirname(manifestPath), plugins[0].file);

        const pluginValidationRes = await pluginManifestUtils.validateAgainstSchema(
          plugins[0],
          pluginPath,
          context
        );
        if (pluginValidationRes.isErr()) {
          return err(pluginValidationRes.error);
        } else {
          pluginValidationResult = pluginValidationRes.value;
          telemetryProperties[TelemetryPropertyKey.pluginValidationErrors] =
            pluginValidationResult?.validationResult
              .map((r: string) => r.replace(/\//g, ""))
              .join(";");
        }
      }

      // Declarative Copilot
      const declarativeCopilots = manifest.copilotExtensions
        ? manifest.copilotExtensions.declarativeCopilots
        : manifest.copilotAgents!.declarativeAgents;
      if (declarativeCopilots?.length && declarativeCopilots[0].file) {
        const declarativeCopilotPath = path.join(
          path.dirname(manifestPath),
          declarativeCopilots[0].file
        );

        const declarativeCopilotValidationRes = await copilotGptManifestUtils.validateAgainstSchema(
          declarativeCopilots[0],
          declarativeCopilotPath,
          context
        );
        if (declarativeCopilotValidationRes.isErr()) {
          return err(declarativeCopilotValidationRes.error);
        } else {
          declarativeCopilotValidationResult = declarativeCopilotValidationRes.value;
          telemetryProperties[TelemetryPropertyKey.gptValidationErrors] =
            declarativeCopilotValidationResult?.validationResult
              .map((r: string) => r.replace(/\//g, ""))
              .join(";");

          if (declarativeCopilotValidationResult.actionValidationResult.length > 0) {
            let errors: string[] = [];
            for (
              let index = 0;
              index < declarativeCopilotValidationResult.actionValidationResult.length;
              index++
            ) {
              errors = errors.concat(
                declarativeCopilotValidationResult.actionValidationResult[
                  index
                ].validationResult.map((r: string) => index.toString() + ":" + r.replace(/\//g, ""))
              );
            }

            telemetryProperties[`${TelemetryPropertyKey.gptActionValidationErrors}`] =
              errors.join(";");
          }
        }
      }
    }

    const actionErrorCount =
      declarativeCopilotValidationResult?.actionValidationResult
        .filter((o) => o.filePath !== pluginPath)
        .reduce((acc, { validationResult }) => acc + validationResult.length, 0) ?? 0;

    const allErrorCount =
      manifestValidationResult.length +
      (declarativeCopilotValidationResult?.validationResult.length ?? 0) +
      (pluginValidationResult?.validationResult.length ?? 0) +
      actionErrorCount;

    if (allErrorCount > 0) {
      const summaryStr = getLocalizedString(
        "driver.teamsApp.summary.validate.failed",
        allErrorCount
      );

      if (context.platform === Platform.CLI) {
        const outputMessage: Array<{ content: string; color: Colors }> = [
          {
            content:
              "Teams Toolkit has checked manifest(s) with corresponding schema:\n\nSummary: \n",
            color: Colors.BRIGHT_WHITE,
          },
          {
            content: `${allErrorCount} failed.\n`,
            color: Colors.BRIGHT_RED,
          },
        ];

        if (manifestValidationResult.length > 0) {
          outputMessage.push({
            content:
              getDefaultString(
                "driver.teamsApp.summary.validateTeamsManifest.checkPath",
                args.manifestPath
              ) + "\n",
            color: Colors.BRIGHT_WHITE,
          });
          manifestValidationResult.map((error: string) => {
            outputMessage.push({ content: `${SummaryConstant.Failed} `, color: Colors.BRIGHT_RED });
            outputMessage.push({
              content: `${error}\n`,
              color: Colors.BRIGHT_WHITE,
            });
          });
        }
        if (declarativeCopilotValidationResult) {
          const validationMessage = copilotGptManifestUtils.logValidationErrors(
            declarativeCopilotValidationResult,
            context.platform,
            pluginPath
          );
          if (validationMessage) {
            outputMessage.push(...(validationMessage as Array<{ content: string; color: Colors }>));
          }
        }

        if (pluginValidationResult) {
          const validationMessage = pluginManifestUtils.logValidationErrors(
            pluginValidationResult,
            context.platform
          );
          if (validationMessage) {
            outputMessage.push(...(validationMessage as Array<{ content: string; color: Colors }>));
          }
        }

        context.ui?.showMessage("info", outputMessage, false);
      } else {
        // logs in output window
        const teamsManifestErrors = manifestValidationResult
          .map((error: string) => {
            return `${SummaryConstant.Failed} ${error}`;
          })
          .join(EOL);
        let outputMessage =
          EOL + getLocalizedString("driver.teamsApp.summary.validateManifest", summaryStr);

        if (teamsManifestErrors.length > 0) {
          outputMessage +=
            EOL +
            getLocalizedString(
              "driver.teamsApp.summary.validateTeamsManifest.checkPath",
              args.manifestPath
            ) +
            EOL +
            teamsManifestErrors;
        }

        if (declarativeCopilotValidationResult) {
          const validationMessage = copilotGptManifestUtils.logValidationErrors(
            declarativeCopilotValidationResult,
            context.platform,
            pluginPath
          ) as string;
          if (validationMessage) {
            outputMessage += EOL + validationMessage;
          }
        }

        if (pluginValidationResult) {
          const validationMessage = pluginManifestUtils.logValidationErrors(
            pluginValidationResult,
            context.platform
          ) as string;
          if (validationMessage) {
            outputMessage += EOL + validationMessage;
          }
        }

        outputMessage += EOL;

        context.logProvider?.info(outputMessage);
      }

      merge(context.telemetryProperties, telemetryProperties);

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
        EOL + getLocalizedString("driver.teamsApp.summary.validateManifest", summaryStr, "", "");
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

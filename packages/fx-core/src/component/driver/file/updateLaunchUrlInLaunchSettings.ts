// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import { Service } from "typedi";

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { getLocalizedString } from "../../../common/localizeUtils";
import { getAbsolutePath, wrapRun } from "../../utils/common";
import { logMessageKeys } from "../aad/utility/constants";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { updateProgress } from "../middleware/updateProgress";
import { InvalidActionInputError, UnhandledError } from "../../../error/common";
import { UpdateLaunchUrlInLaunchSettingsArgs } from "./interface/UpdateLaunchUrlInLaunchSettingsArgs";
import { AppStudioScopes } from "../../../common/tools";

const actionName = "file/updateLaunchUrlInLaunchSettings";
const helpLink = "https://aka.ms/teamsfx-actions/file-updateLaunchUrlInLaunchSettings";

@Service(actionName) // DO NOT MODIFY the service name
export class UpdateLaunchUrlInLaunchSettingsDriver implements StepDriver {
  description = getLocalizedString("driver.file.updateLaunchUrlInLaunchSettings.description");

  @hooks([
    addStartAndEndTelemetry(actionName, actionName),
    updateProgress(getLocalizedString("driver.file.progressBar.updateLaunchUrlInLaunchSettings")),
  ])
  public async run(
    args: UpdateLaunchUrlInLaunchSettingsArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(async () => {
      const result = await this.handler(args, context);
      return result.output;
    });
  }

  @hooks([
    addStartAndEndTelemetry(actionName, actionName),
    updateProgress(getLocalizedString("driver.file.progressBar.updateLaunchUrlInLaunchSettings")),
  ])
  public async execute(
    args: UpdateLaunchUrlInLaunchSettingsArgs,
    ctx: DriverContext
  ): Promise<ExecutionResult> {
    let summaries: string[] = [];
    const outputResult = await wrapRun(async () => {
      const result = await this.handler(args, ctx);
      summaries = result.summaries;
      return result.output;
    });
    return {
      result: outputResult,
      summaries,
    };
  }

  private async handler(
    args: UpdateLaunchUrlInLaunchSettingsArgs,
    context: DriverContext
  ): Promise<{
    output: Map<string, string>;
    summaries: string[];
  }> {
    try {
      const launchSettingsPath = getAbsolutePath(args.target, context.projectPath);
      if (!(await fs.pathExists(launchSettingsPath))) {
        throw new UserError(
          "LaunchSettingsFileNotExist",
          getLocalizedString(
            "driver.file.updateLaunchUrlInLaunchSettings.launchSettingsFileNotExist",
            launchSettingsPath
          ),
          helpLink
        );
      }
      const launchSettingsContent = fs.readFileSync(launchSettingsPath, "utf-8");
      if (args.addLoginHint) {
        const tokenObjectRes = await context.m365TokenProvider.getJsonObject({
          scopes: AppStudioScopes,
        });
        if (tokenObjectRes.isErr()) {
          throw tokenObjectRes.error;
        }
        const tokenObject = tokenObjectRes.value;
        if (tokenObject && "upn" in tokenObject) {
          args.launchUrl = `${args.launchUrl}&login_hint=${tokenObject.upn}`;
        }
      }
      const launchUrlRegex =
        "profiles[\\s\\S]*" +
        args.profile.replace("(", "\\(").replace(")", "\\)") +
        '[\\s\\S]*("launchUrl"\\s*:\\s*"[^"]*")';
      const match = launchSettingsContent.match(launchUrlRegex);
      if (!match) {
        throw new UserError(
          "LaunchUrlInProfileNotExist",
          getLocalizedString(
            "driver.file.updateLaunchUrlInLaunchSettings.launchUrlInProfileNotExist",
            args.profile
          ),
          helpLink
        );
      }
      await fs.writeFile(
        launchSettingsPath,
        launchSettingsContent.replace(match[1], '"launchUrl": "' + args.launchUrl + '"'),
        "utf-8"
      );
      return {
        output: new Map<string, string>(),
        summaries: [
          getLocalizedString("driver.file.updateLaunchUrlInLaunchSettings.summary", args.target),
        ],
      };
    } catch (error) {
      if (error instanceof UserError || error instanceof SystemError) {
        context.logProvider?.error(
          getLocalizedString(logMessageKeys.failExecuteDriver, actionName, error.displayMessage)
        );
        throw error;
      }

      const message = JSON.stringify(error);
      context.logProvider?.error(
        getLocalizedString(logMessageKeys.failExecuteDriver, actionName, message)
      );
      throw new UnhandledError(error as Error, actionName);
    }
  }
}

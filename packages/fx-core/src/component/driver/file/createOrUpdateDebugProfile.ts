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
import { UnhandledError } from "../../../error/common";
import { CreateOrUpdateDebugProfileArgs } from "./interface/createOrUpdateDebugProfileArgs";
import { AppStudioScopes } from "../../../common/tools";
import { parse } from "comment-json";
import * as commentJson from "comment-json";
import * as utils from "util";
import { internalOutputNames } from "../teamsApp/create";
import { isCommentObject } from "../../../core/middleware/utils/debug/debugV3MigrationUtils";

const actionName = "file/createOrUpdateDebugProfile";
const helpLink = "https://aka.ms/teamsfx-actions/file-createOrUpdateDebugProfile";
const launchSettingsFilePath = "./Properties/launchSettings.json";
const launchUrlTemplate =
  "https://teams.microsoft.com/l/app/%s?installAppPackage=true&webjoin=true&appTenantId=%s";

@Service(actionName) // DO NOT MODIFY the service name
export class CreateOrUpdateDebugProfileDriver implements StepDriver {
  description = getLocalizedString("driver.file.createOrUpdateDebugProfile.description");

  @hooks([
    addStartAndEndTelemetry(actionName, actionName),
    updateProgress(getLocalizedString("driver.file.progressBar.createOrUpdateDebugProfile")),
  ])
  public async run(
    args: CreateOrUpdateDebugProfileArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(async () => {
      const result = await this.handler(args, context);
      return result.output;
    });
  }

  @hooks([
    addStartAndEndTelemetry(actionName, actionName),
    updateProgress(getLocalizedString("driver.file.progressBar.createOrUpdateDebugProfile")),
  ])
  public async execute(
    args: CreateOrUpdateDebugProfileArgs,
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
    args: CreateOrUpdateDebugProfileArgs,
    context: DriverContext
  ): Promise<{
    output: Map<string, string>;
    summaries: string[];
  }> {
    try {
      const launchSettingsPath = getAbsolutePath(launchSettingsFilePath, context.projectPath);
      if (!(await fs.pathExists(launchSettingsPath))) {
        await fs.writeFile(launchSettingsPath, "{}", "utf-8");
      }
      const launchSettingsContent = await fs.readFile(launchSettingsPath, "utf-8");
      const data = parse(launchSettingsContent.toString());
      if (!isCommentObject(data)) {
        throw new UserError(
          "LaunchSettingsFileInvalid",
          getLocalizedString(
            "driver.file.createOrUpdateDebugProfile.launchSettingsFileInvalid",
            launchSettingsPath
          ),
          helpLink
        );
      }
      let launchUrl = utils.format(
        launchUrlTemplate,
        args.appId,
        process.env[internalOutputNames.teamsAppTenantId]
      );
      if (args.loginHint === undefined || args.loginHint === true) {
        const tokenObjectRes = await context.m365TokenProvider.getJsonObject({
          scopes: AppStudioScopes,
        });
        if (tokenObjectRes.isErr()) {
          throw tokenObjectRes.error;
        }
        const tokenObject = tokenObjectRes.value;
        if (tokenObject && "upn" in tokenObject) {
          launchUrl += `&login_hint=${tokenObject.upn}`;
        }
      }
      (data as any).profiles = data.profiles || {};
      (data.profiles as any)[args.name] = (data.profiles as any)[args.name] || {};
      (data.profiles as any)[args.name].launchUrl = launchUrl;
      await fs.writeFile(launchSettingsPath, commentJson.stringify(data, null, 4), "utf-8");
      return {
        output: new Map<string, string>(),
        summaries: [
          getLocalizedString(
            "driver.file.createOrUpdateDebugProfile.summary",
            launchSettingsFilePath
          ),
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

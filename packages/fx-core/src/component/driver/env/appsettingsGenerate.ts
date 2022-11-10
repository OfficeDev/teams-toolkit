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
import { StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { InvalidParameterUserError } from "./error/invalidParameterUserError";
import { UnhandledSystemError } from "./error/unhandledError";
import { GenerateAppsettingsArgs } from "./interface/generateAppsettingsArgs";

const actionName = "appsettings/generate";
const helpLink = "https://aka.ms/teamsfx-actions/appsettings-generate";

@Service(actionName) // DO NOT MODIFY the service name
export class GenerateAppsettingsDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: GenerateAppsettingsArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(() => this.handler(args, context));
  }

  private async handler(
    args: GenerateAppsettingsArgs,
    context: DriverContext
  ): Promise<Map<string, string>> {
    try {
      this.validateArgs(args);
      const appsettingsPath = getAbsolutePath(args.target, context.projectPath);
      const appSettingsJson = JSON.parse(fs.readFileSync(appsettingsPath, "utf-8"));
      this.replaceProjectAppsettings(appSettingsJson, args.appsettings);
      await fs.writeFile(appsettingsPath, JSON.stringify(appSettingsJson, null, "\t"), "utf-8");

      return new Map();
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
      throw new UnhandledSystemError(actionName, message);
    }
  }

  private validateArgs(args: GenerateAppsettingsArgs): void {
    const invalidParameters: string[] = [];
    if (args.target === undefined) {
      invalidParameters.push("target");
    } else if (
      args.target !== undefined &&
      (typeof args.target !== "string" || args.target.length === 0)
    ) {
      invalidParameters.push("target");
    }

    if (!args.appsettings || typeof args.appsettings !== "object") {
      invalidParameters.push("appsettings");
    }

    for (const value of Object.values(args.appsettings)) {
      if (!value) {
        invalidParameters.push("appsettings");
      }
    }

    if (invalidParameters.length > 0) {
      throw new InvalidParameterUserError(actionName, invalidParameters, helpLink);
    }
  }

  private replaceProjectAppsettings(
    projectAppsettings: Record<string, unknown>,
    ymlAppsettings: Record<string, unknown>
  ) {
    for (const item of Object.entries(ymlAppsettings)) {
      if (typeof item[1] === "string") {
        (projectAppsettings as any)[item[0]] = item[1];
      } else if (typeof item[1] === "object") {
        this.replaceProjectAppsettings((projectAppsettings as any)[item[0]], item[1] as any);
      }
    }
  }
}

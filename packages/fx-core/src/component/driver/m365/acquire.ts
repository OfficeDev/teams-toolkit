// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import { Service } from "typedi";

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { getLocalizedString } from "../../../common/localizeUtils";
import { PackageService } from "../../../common/m365/packageService";
import { serviceEndpoint, serviceScope } from "../../../common/m365/serviceConstant";
import { getAbsolutePath, wrapRun } from "../../utils/common";
import { logMessageKeys } from "../aad/utility/constants";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { UnhandledSystemError } from "./error/unhandledError";
import { FileNotFoundUserError } from "./error/FileNotFoundUserError";
import { InvalidActionInputError } from "../../../error/common";

interface AcquireArgs {
  appPackagePath?: string; // The path of the app package
}

const actionName = "m365Title/acquire";
const helpLink = "https://aka.ms/teamsfx-actions/m365-title-acquire";

const defaultOutputEnvVarNames = {
  titleId: "M365_TITLE_ID",
  appId: "M365_APP_ID",
};

const outputKeys = {
  titleId: "titleId",
  appId: "appId",
};

@Service(actionName) // DO NOT MODIFY the service name
export class M365TitleAcquireDriver implements StepDriver {
  description = getLocalizedString("driver.m365.acquire.description");

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: AcquireArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(async () => {
      const result = await this.handler(args, context);
      return result.output;
    });
  }

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async execute(
    args: AcquireArgs,
    ctx: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<ExecutionResult> {
    let summaries: string[] = [];
    const outputResult = await wrapRun(async () => {
      const result = await this.handler(args, ctx, outputEnvVarNames);
      summaries = result.summaries;
      return result.output;
    });
    return {
      result: outputResult,
      summaries,
    };
  }

  private async handler(
    args: AcquireArgs,
    context: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<{
    output: Map<string, string>;
    summaries: string[];
  }> {
    const progressHandler = context.ui?.createProgressBar(
      getLocalizedString("driver.m365.acquire.progress.title"),
      1
    );

    try {
      await progressHandler?.start();

      this.validateArgs(args);
      if (!outputEnvVarNames) {
        outputEnvVarNames = new Map(Object.entries(defaultOutputEnvVarNames));
      }
      const appPackagePath = getAbsolutePath(args.appPackagePath!, context.projectPath);
      if (!(await fs.pathExists(appPackagePath))) {
        throw new FileNotFoundUserError(actionName, appPackagePath, helpLink);
      }

      await progressHandler?.next(getLocalizedString("driver.m365.acquire.progress.message"));

      // get sideloading service settings
      const sideloadingServiceEndpoint =
        process.env.SIDELOADING_SERVICE_ENDPOINT ?? serviceEndpoint;
      const sideloadingServiceScope = process.env.SIDELOADING_SERVICE_SCOPE ?? serviceScope;

      const packageService = new PackageService(sideloadingServiceEndpoint);
      const sideloadingTokenRes = await context.m365TokenProvider.getAccessToken({
        scopes: [sideloadingServiceScope],
      });
      if (sideloadingTokenRes.isErr()) {
        throw sideloadingTokenRes.error;
      }
      const sideloadingToken = sideloadingTokenRes.value;
      const sideloadingRes = await packageService.sideLoading(sideloadingToken, appPackagePath);

      await progressHandler?.end(true);

      return {
        output: new Map([
          [outputEnvVarNames.get(outputKeys.titleId)!, sideloadingRes[0]],
          [outputEnvVarNames.get(outputKeys.appId)!, sideloadingRes[1]],
        ]),
        summaries: [getLocalizedString("driver.m365.acquire.summary", sideloadingRes[0])],
      };
    } catch (error) {
      await progressHandler?.end(false);

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

  private validateArgs(args: AcquireArgs): void {
    const invalidParameters: string[] = [];

    if (!args.appPackagePath || typeof args.appPackagePath !== "string") {
      invalidParameters.push("appPackagePath");
    }

    if (invalidParameters.length > 0) {
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
    }
  }
}

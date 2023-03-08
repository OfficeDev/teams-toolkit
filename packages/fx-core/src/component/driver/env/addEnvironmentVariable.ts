// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { getLocalizedString } from "../../../common/localizeUtils";
import { wrapRun } from "../../utils/common";
import { logMessageKeys } from "../aad/utility/constants";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { InvalidParameterUserError } from "../file/error/invalidParameterUserError";
import { UnhandledSystemError } from "../file/error/unhandledError";
import { GenerateEnvArgs } from "../file/interface/generateEnvArgs";

const actionName = "env/addEnvironmentVariable";
const helpLink = "https://aka.ms/teamsfx-actions/env-addEnvironmentVariable";

@Service(actionName) // DO NOT MODIFY the service name
export class AddEnvDriver implements StepDriver {
  description = getLocalizedString("driver.env.addEnvironmentVariable.description");

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: GenerateEnvArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(async () => {
      const result = await this.handler(args, context);
      return result.output;
    });
  }

  public async execute(args: GenerateEnvArgs, ctx: DriverContext): Promise<ExecutionResult> {
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
    args: GenerateEnvArgs,
    context: DriverContext
  ): Promise<{
    output: Map<string, string>;
    summaries: string[];
  }> {
    try {
      this.validateArgs(args);
      const state = this.loadCurrentState();
      return {
        output: new Map(Object.entries(args.envs)),
        summaries: [
          getLocalizedString("driver.env.addEnvironmentVariable.summary", state.TEAMSFX_ENV),
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
      throw new UnhandledSystemError(actionName, message);
    }
  }

  private validateArgs(args: GenerateEnvArgs): void {
    const invalidParameters: string[] = [];

    if (!args.envs || typeof args.envs !== "object") {
      invalidParameters.push("envs");
    } else {
      for (const value of Object.values(args.envs)) {
        if (value === undefined || value === null || typeof value === "object") {
          invalidParameters.push("envs");
        }
      }
    }

    if (invalidParameters.length > 0) {
      throw new InvalidParameterUserError(actionName, invalidParameters, helpLink);
    }
  }

  private loadCurrentState() {
    return {
      TEAMSFX_ENV: process.env.TEAMSFX_ENV,
    };
  }
}

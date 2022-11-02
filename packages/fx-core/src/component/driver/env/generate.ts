// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import * as os from "os";
import { Service } from "typedi";

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { getLocalizedString } from "../../../common/localizeUtils";
import { wrapRun } from "../../utils/common";
import { logMessageKeys } from "../aad/utility/constants";
import { DriverContext } from "../interface/commonArgs";
import { StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { InvalidParameterUserError } from "./error/invalidParameterUserError";
import { UnhandledSystemError } from "./error/unhandledError";
import { GenerateEnvArgs } from "./interface/generateEnvArgs";

const actionName = "env/generate";
const helpLink = "https://aka.ms/teamsfx-actions/env-generate";

@Service(actionName) // DO NOT MODIFY the service name
export class GenerateEnvDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: GenerateEnvArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(() => this.handler(args, context));
  }

  private async handler(
    args: GenerateEnvArgs,
    context: DriverContext
  ): Promise<Map<string, string>> {
    try {
      this.validateArgs(args);

      if (args.target) {
        await fs.ensureFile(args.target);
        const envs = dotenv.parse(await fs.readFile(args.target));
        const content = Object.entries({ ...envs, ...args.envs })
          .map(([key, value]) => `${key}=${value}`)
          .join(os.EOL);
        await fs.writeFile(args.target, content);

        return new Map();
      } else {
        return new Map(Object.entries(args.envs));
      }
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
    if (
      args.target !== undefined &&
      (typeof args.target !== "string" || args.target.length === 0)
    ) {
      invalidParameters.push("target");
    }

    if (!args.envs || typeof args.envs !== "object") {
      invalidParameters.push("envs");
    }

    for (const value of Object.values(args.envs)) {
      if (!value || typeof value === "object") {
        invalidParameters.push("envs");
      }
    }

    if (invalidParameters.length > 0) {
      throw new InvalidParameterUserError(actionName, invalidParameters, helpLink);
    }
  }
}

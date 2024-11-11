// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as dotenv from "dotenv";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { Service } from "typedi";
import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../common/localizeUtils";
import { InvalidActionInputError, assembleError } from "../../../error/common";
import { wrapRun } from "../../utils/common";
import { logMessageKeys } from "../aad/utility/constants";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { GenerateEnvArgs } from "./interface/generateEnvArgs";
import { pathUtils } from "../../utils/pathUtils";

const actionName = "file/createOrUpdateEnvironmentFile";
const helpLink = "https://aka.ms/teamsfx-actions/file-createOrUpdateEnvironmentFile";

@Service(actionName) // DO NOT MODIFY the service name
export class CreateOrUpdateEnvironmentFileDriver implements StepDriver {
  description = getLocalizedString("driver.file.createOrUpdateEnvironmentFile.description");
  readonly progressTitle = getLocalizedString("driver.file.progressBar.env");

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: GenerateEnvArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(async () => {
      const result = await this.handler(args, context);
      return result.output;
    }, actionName);
  }

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async execute(args: GenerateEnvArgs, ctx: DriverContext): Promise<ExecutionResult> {
    let summaries: string[] = [];
    const outputResult = await wrapRun(async () => {
      const result = await this.handler(args, ctx);
      summaries = result.summaries;
      return result.output;
    }, actionName);
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
      const target = pathUtils.resolveFilePath(context.projectPath, args.target);
      await fs.ensureFile(target);
      const envs = dotenv.parse(await fs.readFile(target));
      context.logProvider?.debug(`Existing envs: ${JSON.stringify(envs)}`);
      const updatedEnvs = Object.entries({ ...envs, ...args.envs }).map(
        ([key, value]) => `${key}=${value}`
      );
      context.logProvider?.debug(`Updated envs: ${JSON.stringify(updatedEnvs)}`);
      await fs.writeFile(target, updatedEnvs.join(os.EOL));
      const map = new Map<string, string>();
      const envFilePathRes = await pathUtils.getEnvFilePath(
        context.projectPath,
        process.env.TEAMSFX_ENV || "dev"
      );
      if (envFilePathRes.isOk()) {
        if (path.resolve(target) === path.resolve(envFilePathRes.value!)) {
          for (const key of Object.keys(args.envs)) {
            map.set(key, args.envs[key]);
          }
        }
      }
      return {
        output: map,
        summaries: [
          getLocalizedString(
            "driver.file.createOrUpdateEnvironmentFile.summary",
            path.normalize(target)
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
      throw assembleError(error as Error, actionName);
    }
  }

  private validateArgs(args: GenerateEnvArgs): void {
    const invalidParameters: string[] = [];
    if (!args.target || typeof args.target !== "string" || args.target.length === 0) {
      invalidParameters.push("target");
    }

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
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
    }
  }
}

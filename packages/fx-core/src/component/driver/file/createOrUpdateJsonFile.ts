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
import { GenerateJsonArgs } from "./interface/generateJsonArgs";
import { InvalidActionInputError, UnhandledError } from "../../../error/common";
import * as commentJson from "comment-json";
import { CommentJSONValue } from "comment-json";

const actionName = "file/createOrUpdateJsonFile";
const helpLink = "https://aka.ms/teamsfx-actions/file-createOrUpdateJsonFile";

@Service(actionName) // DO NOT MODIFY the service name
export class CreateOrUpdateJsonFileDriver implements StepDriver {
  description = getLocalizedString("driver.file.createOrUpdateJsonFile.description");

  @hooks([
    addStartAndEndTelemetry(actionName, actionName),
    updateProgress(getLocalizedString("driver.file.progressBar.appsettings")),
  ])
  public async run(
    args: GenerateJsonArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(async () => {
      const result = await this.handler(args, context);
      return result.output;
    }, actionName);
  }

  @hooks([
    addStartAndEndTelemetry(actionName, actionName),
    updateProgress(getLocalizedString("driver.file.progressBar.appsettings")),
  ])
  public async execute(args: GenerateJsonArgs, ctx: DriverContext): Promise<ExecutionResult> {
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
    args: GenerateJsonArgs,
    context: DriverContext
  ): Promise<{
    output: Map<string, string>;
    summaries: string[];
  }> {
    try {
      this.validateArgs(args);
      const jsonFilePath = getAbsolutePath(args.target, context.projectPath);
      if (!(await fs.pathExists(jsonFilePath))) {
        await fs.ensureFile(jsonFilePath);
        await fs.writeFile(jsonFilePath, "{}", "utf-8");
      }
      const jsonContent = commentJson.parse((await fs.readFile(jsonFilePath, "utf-8")).toString());
      this.addOrUpdateJsonContent(jsonContent, args.appsettings ?? args.content ?? {});
      await fs.writeFile(jsonFilePath, commentJson.stringify(jsonContent, null, "\t"), "utf-8");
      return {
        output: new Map<string, string>(),
        summaries: [getLocalizedString("driver.file.createOrUpdateJsonFile.summary", args.target)],
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

  private validateArgs(args: GenerateJsonArgs): void {
    const invalidParameters: string[] = [];
    if (args.target === undefined) {
      invalidParameters.push("target");
    } else if (
      args.target !== undefined &&
      (typeof args.target !== "string" || args.target.length === 0)
    ) {
      invalidParameters.push("target");
    }

    if (args.appsettings === undefined && args.content === undefined) {
      invalidParameters.push("content");
    } else if (args.appsettings !== undefined && args.content !== undefined) {
      invalidParameters.push("appsettings");
    } else if (args.appsettings) {
      if (typeof args.appsettings !== "object") {
        invalidParameters.push("appsettings");
      }
    } else if (args.content) {
      if (typeof args.content !== "object") {
        invalidParameters.push("content");
      }
    }

    if (invalidParameters.length > 0) {
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
    }
  }

  private addOrUpdateJsonContent(
    jsonContent: CommentJSONValue,
    ymlJsonContent: Record<string, unknown>
  ) {
    for (const [key, value] of Object.entries(ymlJsonContent)) {
      if (typeof value === "object") {
        if (!(jsonContent as any)[key]) {
          (jsonContent as any)[key] = value;
        } else {
          this.addOrUpdateJsonContent((jsonContent as any)[key], value as any);
        }
      } else {
        (jsonContent as any)[key] = value;
      }
    }
  }
}

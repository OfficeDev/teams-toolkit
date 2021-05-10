// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import fs, { readFileSync } from "fs-extra";
import os from "os";
import path from "path";

import {
  QTreeNode,
  FxError,
  Result,
  UserError,
  SystemError,
  err,
  Stage,
  Platform,
  ok,
  Func
} from "@microsoft/teamsfx-api";

import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";
import { UnknownError } from "../error";
import activate from "../activate";
import { CliTelemetryReporter } from "../commonlib/telemetry";
import { CliTelemetry } from "../telemetry/cliTelemetry";

export abstract class Generator {
  abstract readonly commandName: string;

  abstract readonly outputPath: string;

  readonly doUserTask: boolean = false;
  readonly func?: Func;
  readonly stage?: Stage;

  async generate(projectPath?: string): Promise<Result<QTreeNode | QTreeNode[], FxError>> {
    if (projectPath) {
      const cliPackage = JSON.parse(readFileSync(path.join(__dirname, "../../package.json"), "utf8"));
      const reporter = new CliTelemetryReporter(cliPackage.aiKey, cliPackage.name, cliPackage.version);
      CliTelemetry.setReporter(reporter);
    }
    const result = await activate(projectPath);
    if (result.isErr()) {
      return err(result.error);
    }

    const core = result.value;
    {
      const result = this.doUserTask
        ? await core.getQuestionsForUserTask!(this.func!, Platform.CLI)
        : await core.getQuestions!(this.stage!, Platform.CLI);

      if (result.isErr()) {
        return err(result.error);
      }

      const root = result.value!;
      return ok(root);
    }
  }

  public async run(projectPath?: string) {
    try {
      CLILogProvider.info(this.toLogMsg(`Start to generate '${this.commandName}' parameters`));
      const result = await this.generate(projectPath);
      if (result.isErr()) {
        throw result.error;
      }
      CLILogProvider.info(this.toLogMsg(`Finish to generate '${this.commandName}' parameters`));

      CLILogProvider.info(this.toLogMsg(`Start to write '${this.commandName}' parameters`));
      await this.writeJSON(result.value);
      CLILogProvider.info(this.toLogMsg(`Finish to write '${this.commandName}' parameters to ${this.outputPath}`));
    } catch (e) {
      const FxError: FxError =
        e instanceof UserError || e instanceof SystemError ? e : UnknownError(e);
      let errorMsg = `code:${FxError.source}.${FxError.name}\n\tmessage: ${FxError.message}`;
      if (FxError instanceof UserError && FxError.helpLink) {
        errorMsg += `\n\thelp link: ${FxError.helpLink}`;
      }
      if (FxError instanceof SystemError && FxError.issueLink) {
        errorMsg += `\n\tissue link: ${FxError.issueLink}`;
      }
      if (CLILogProvider.getLogLevel() === constants.CLILogLevel.debug) {
        errorMsg += `\nstack: ${FxError.stack}`;
      }
      CLILogProvider.error(errorMsg);
    }
  }

  public toLogMsg(body: string) {
    return `[ParamGenerator] ${body}`;
  }

  public async writeJSON(params: any) {
    return fs.writeJSON(this.outputPath, params, {
      spaces: 4,
      EOL: os.EOL,
      encoding: "utf-8"
    });
  }
}

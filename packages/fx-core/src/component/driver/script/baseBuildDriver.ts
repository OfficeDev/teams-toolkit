// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BuildArgs } from "../interface/buildAndDeployArgs";
import { asFactory, asOptional, asString, checkMissingArgs, asRecord } from "../../utils/common";
import { execute } from "../../code/utils";
import { ExecuteCommandError } from "../../error/componentError";
import { DeployConstant } from "../../constant/deployConstant";
import { IProgressHandler, LogProvider, TelemetryReporter } from "@microsoft/teamsfx-api";
import { DriverContext } from "../interface/commonArgs";

export abstract class BaseBuildDriver {
  args: unknown;
  progressBarName: string;
  progressBarSteps = 1;
  workingDirectory?: string;
  protected logProvider: LogProvider;
  protected progressBar?: IProgressHandler;
  protected telemetryReporter: TelemetryReporter;
  static readonly emptyMap = new Map<string, string>();
  abstract buildPrefix: string;

  constructor(args: unknown, context: DriverContext) {
    this.args = args;
    this.workingDirectory = this.toBuildArgs().workingDirectory;
    this.progressBarName = `Building project ${this.workingDirectory}`;
    this.progressBar = context.ui?.createProgressBar(this.progressBarName, this.progressBarSteps);
    this.logProvider = context.logProvider;
    this.telemetryReporter = context.telemetryReporter;
  }

  protected static asBuildArgs = asFactory<BuildArgs>({
    workingDirectory: asString,
    args: asString,
    env: asOptional(asRecord),
  });

  protected toBuildArgs(): BuildArgs {
    return BaseBuildDriver.asBuildArgs(this.args);
  }

  async run(): Promise<Map<string, string>> {
    const args = this.toBuildArgs();
    const commandSuffix = checkMissingArgs("BuildCommand", args.args).trim();
    const command = `${this.buildPrefix} ${commandSuffix}`;
    const env = args.env ? args.env : undefined;
    await this.progressBar?.start(`Run command ${command} at ${args.workingDirectory}`);
    try {
      const output = await execute(command, args.workingDirectory, this.logProvider, env);
      await this.logProvider.debug(`execute ${command} output is ${output}`);
      await this.progressBar?.end(true);
    } catch (e) {
      throw ExecuteCommandError.fromErrorOutput(
        DeployConstant.DEPLOY_ERROR_TYPE,
        [command, args.workingDirectory ?? ""],
        e
      );
    }
    return BaseBuildDriver.emptyMap;
  }

  /**
   * call when error happens
   * do some resource clean up
   */
  async cleanup(): Promise<void> {
    await this.progressBar?.end(false);
  }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BuildArgs } from "../interface/buildAndDeployArgs";
import { asFactory, asOptional, asString, checkMissingArgs } from "../../utils/common";
import { execute } from "../../code/utils";
import { ExecuteCommandError } from "../../error/componentError";
import { DeployConstant } from "../../constant/deployConstant";
import { IProgressHandler, LogProvider, TelemetryReporter } from "@microsoft/teamsfx-api";
import { DriverContext } from "../interface/commonArgs";
import * as path from "path";

export abstract class BaseBuildDriver {
  args: BuildArgs;
  progressBarName: string;
  progressBarSteps = 1;
  workingDirectory?: string;
  execPath?: string;
  protected context: DriverContext;
  protected logProvider: LogProvider;
  protected progressBar?: IProgressHandler;
  protected telemetryReporter: TelemetryReporter;
  static readonly emptyMap = new Map<string, string>();
  abstract buildPrefix: string;

  constructor(args: unknown, context: DriverContext) {
    this.args = BaseBuildDriver.toBuildArgs(args);
    this.args.workingDirectory = this.args.workingDirectory ?? "./";
    // if working dir is not absolute path, then join the path with project path
    this.workingDirectory = path.isAbsolute(this.args.workingDirectory)
      ? this.args.workingDirectory
      : path.join(context.projectPath, this.args.workingDirectory);
    this.progressBarName = `Building project ${this.workingDirectory}`;
    this.logProvider = context.logProvider;
    this.telemetryReporter = context.telemetryReporter;
    this.context = context;
    this.execPath = this.args.execPath;
  }

  protected static asBuildArgs = asFactory<BuildArgs>({
    workingDirectory: asOptional(asString),
    args: asString,
    execPath: asOptional(asString),
  });

  protected static toBuildArgs(args: unknown): BuildArgs {
    return BaseBuildDriver.asBuildArgs(args);
  }

  async run(): Promise<Map<string, string>> {
    this.progressBar = this.context.ui?.createProgressBar(
      this.progressBarName,
      this.progressBarSteps
    );
    const command = this.getCommand();
    await this.progressBar?.start();
    // add path to env if execPath is set
    let env: NodeJS.ProcessEnv | undefined = undefined;
    if (this.execPath) {
      env = { PATH: `${this.execPath}${path.delimiter}${process.env.PATH}` };
    }
    await this.progressBar?.next(`Run command ${command} at ${this.workingDirectory}`);
    try {
      const output = await execute(command, this.workingDirectory, this.logProvider, env);
      await this.logProvider.debug(`execute ${command} output is ${output}`);
      await this.progressBar?.end(true);
    } catch (e) {
      throw ExecuteCommandError.fromErrorOutput(
        DeployConstant.DEPLOY_ERROR_TYPE,
        [command, this.workingDirectory ?? ""],
        e
      );
    }
    return BaseBuildDriver.emptyMap;
  }

  getCommand(): string {
    const commandSuffix = checkMissingArgs("BuildCommand", this.args.args).trim();
    return `${this.buildPrefix} ${commandSuffix}`;
  }

  /**
   * call when error happens
   * do some resource clean up
   */
  async cleanup(): Promise<void> {
    await this.progressBar?.end(false);
  }
}

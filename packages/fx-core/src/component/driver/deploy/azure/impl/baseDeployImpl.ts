// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author FanH <Siglud@gmail.com>
 */
import { DeployArgs, DeployContext, DeployStepArgs } from "../../../interface/buildAndDeployArgs";
import { BaseComponentInnerError } from "../../../../error/componentError";
import ignore, { Ignore } from "ignore";
import { DeployConstant } from "../../../../constant/deployConstant";
import * as path from "path";
import * as fs from "fs-extra";
import { zipFolderAsync } from "../../../../utils/fileOperation";
import { asBoolean, asFactory, asOptional, asString } from "../../../../utils/common";
import { ExecutionResult } from "../../../interface/stepDriver";
import { ok, err, IProgressHandler, UserInteraction, LogProvider } from "@microsoft/teamsfx-api";
import { DriverContext } from "../../../interface/commonArgs";

export abstract class BaseDeployImpl {
  args: unknown;
  context: DeployContext;
  workingDirectory: string;
  distDirectory: string;
  dryRun = false;
  protected logger?: LogProvider;
  protected ui?: UserInteraction;
  protected progressBar?: IProgressHandler;
  protected static readonly emptyMap = new Map<string, string>();
  protected helpLink: string | undefined = undefined;
  protected abstract summaries: () => string[];
  protected abstract summaryPrepare: () => string[];
  protected abstract progressNames: (() => string)[];
  protected progressPrepare: (() => string)[] = [];
  protected abstract progressHandler?: AsyncIterableIterator<void>;

  constructor(args: unknown, context: DriverContext) {
    this.args = args;
    this.workingDirectory = context.projectPath;
    this.distDirectory = "";
    this.ui = context.ui;
    this.logger = context.logProvider;
    this.context = {
      azureAccountProvider: context.azureAccountProvider,
      progressBar: this.progressBar,
      logProvider: context.logProvider,
      telemetryReporter: context.telemetryReporter,
    };
  }

  abstract createProgressBar(ui?: UserInteraction): IProgressHandler | undefined;

  protected static asDeployArgs = asFactory<DeployArgs>({
    workingDirectory: asOptional(asString),
    distributionPath: asString,
    ignoreFile: asOptional(asString),
    resourceId: asString,
    dryRun: asOptional(asBoolean),
  });

  async run(): Promise<ExecutionResult> {
    await this.context.logProvider.debug("start deploy process");

    return await this.wrapErrorHandler(async () => {
      const deployArgs = BaseDeployImpl.asDeployArgs(this.args, this.helpLink);
      // if working directory not set, use current working directory
      deployArgs.workingDirectory = deployArgs.workingDirectory ?? "./";
      // if working dir is not absolute path, then join the path with project path
      this.workingDirectory = this.handlePath(deployArgs.workingDirectory, this.workingDirectory);
      // if distribution path is not absolute path, then join the path with project path
      this.distDirectory = this.handlePath(deployArgs.distributionPath, this.workingDirectory);
      this.dryRun = deployArgs.dryRun ?? false;
      // call real deploy
      return await this.deploy(deployArgs);
    });
  }

  private handlePath(inputPath: string, baseFolder: string): string {
    return path.isAbsolute(inputPath) ? inputPath : path.join(baseFolder, inputPath);
  }

  protected async handleIgnore(args: DeployStepArgs, context: DeployContext): Promise<Ignore> {
    // always add deploy temp folder into ignore list
    const ig = ignore().add(DeployConstant.DEPLOYMENT_TMP_FOLDER);
    if (args.ignoreFile) {
      const ignoreFilePath = path.join(this.workingDirectory, args.ignoreFile);
      if (await fs.pathExists(ignoreFilePath)) {
        const ignoreFileContent = await fs.readFile(ignoreFilePath);
        ignoreFileContent
          .toString()
          .split("\n")
          .map((line) => line.trim())
          .forEach((it) => {
            ig.add(it);
          });
      } else {
        await context.logProvider.warning(
          `already set deploy ignore file ${args.ignoreFile} but file not exists in ${this.workingDirectory}, skip ignore!`
        );
      }
    }
    return ig;
  }

  protected async wrapErrorHandler(fn: () => boolean | Promise<boolean>): Promise<ExecutionResult> {
    try {
      return (await fn())
        ? { result: ok(BaseDeployImpl.emptyMap), summaries: this.summaries() }
        : { result: ok(BaseDeployImpl.emptyMap), summaries: this.summaryPrepare() };
    } catch (e) {
      await this.context.progressBar?.end(false);
      if (e instanceof BaseComponentInnerError) {
        const errorDetail = e.detail ? `Detail: ${e.detail}` : "";
        await this.context.logProvider.error(`${e.message} ${errorDetail}`);
        return { result: err(e.toFxError()), summaries: [] };
      } else {
        await this.context.logProvider.error(`Unknown error: ${e}`);
        return {
          result: err(BaseComponentInnerError.unknownError("Deploy", e).toFxError()),
          summaries: [],
        };
      }
    }
  }

  /**
   * real deploy process
   * @param args deploy arguments
   */
  abstract deploy(args: DeployArgs): Promise<boolean>;
}

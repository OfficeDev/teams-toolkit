// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeployArgs, DeployContext, DeployStepArgs } from "../../interface/buildAndDeployArgs";
import { BaseComponentInnerError } from "../../../error/componentError";
import ignore, { Ignore } from "ignore";
import { DeployConstant } from "../../../constant/deployConstant";
import * as path from "path";
import * as fs from "fs-extra";
import { zipFolderAsync } from "../../../utils/fileOperation";
import { asFactory, asOptional, asString } from "../../../utils/common";
import { BaseDeployStepDriver } from "../../interface/baseDeployStepDriver";

export abstract class BaseDeployDriver extends BaseDeployStepDriver {
  protected static readonly emptyMap = new Map<string, string>();
  protected helpLink: string | undefined = undefined;

  protected static asDeployArgs = asFactory<DeployArgs>({
    workingDirectory: asOptional(asString),
    distributionPath: asString,
    ignoreFile: asOptional(asString),
    resourceId: asOptional(asString),
  });

  async run(): Promise<Map<string, string>> {
    await this.context.logProvider.debug("start deploy process");

    const deployArgs = BaseDeployDriver.asDeployArgs(this.args, this.helpLink);
    // if working directory not set, use current working directory
    deployArgs.workingDirectory = deployArgs.workingDirectory ?? "./";
    // if working dir is not absolute path, then join the path with project path
    this.workingDirectory = path.isAbsolute(deployArgs.workingDirectory)
      ? deployArgs.workingDirectory
      : path.join(this.workingDirectory, deployArgs.workingDirectory);
    // if distribution path is not absolute path, then join the path with project path
    this.distDirectory = path.isAbsolute(deployArgs.distributionPath)
      ? deployArgs.distributionPath
      : path.join(this.workingDirectory, deployArgs.distributionPath);
    // call real deploy
    await this.wrapErrorHandler(async () => {
      await this.deploy(deployArgs);
    });
    return BaseDeployDriver.emptyMap;
  }

  /**
   * pack dist folder into zip
   * @param args dist folder and ignore files
   * @param context log provider etc..
   * @protected
   */
  protected async packageToZip(args: DeployStepArgs, context: DeployContext): Promise<Buffer> {
    const ig = await this.handleIgnore(args, context);
    const zipFilePath = path.join(
      this.workingDirectory,
      DeployConstant.DEPLOYMENT_TMP_FOLDER,
      DeployConstant.DEPLOYMENT_ZIP_CACHE_FILE
    );
    await this.context.logProvider?.debug(`start zip dist folder ${this.distDirectory}`);
    const res = await zipFolderAsync(this.distDirectory, zipFilePath, ig);
    await this.context.logProvider?.debug(
      `zip dist folder ${this.distDirectory} to ${zipFilePath} complete`
    );
    return res;
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

  protected async wrapErrorHandler<T>(fn: () => T | Promise<T>): Promise<T> {
    try {
      return Promise.resolve(fn());
    } catch (e) {
      await this.context.progressBar?.end(false);
      if (e instanceof BaseComponentInnerError) {
        const errorDetail = e.detail ? `Detail: ${e.detail}` : "";
        await this.context.logProvider.error(`${e.message} ${errorDetail}`);
        throw e.toFxError();
      } else {
        await this.context.logProvider.error(`Unknown error: ${e}`);
        throw e;
      }
    }
  }

  /**
   * real deploy process
   * @param args deploy arguments
   */
  abstract deploy(args: DeployArgs): Promise<void>;
}

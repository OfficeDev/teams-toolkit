// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BuildArgs } from "../interface/buildAndDeployArgs";
import { asFactory, asString, checkMissingArgs } from "../utils/common";
import { BaseStepDriver } from "./baseStepDriver";
import { execute } from "../code/utils";
import { ExecuteCommandError } from "../error/componentError";
import { DeployConstant } from "../constant/deployConstant";

export abstract class BaseBuildDriver extends BaseStepDriver {
  static readonly emptyMap = new Map<string, string>();
  abstract buildPrefix: string;

  protected static asBuildArgs = asFactory<BuildArgs>({
    src: asString,
    buildCommand: asString,
  });

  protected toBuildArgs(): BuildArgs {
    return BaseBuildDriver.asBuildArgs(this.args);
  }

  async run(): Promise<Map<string, string>> {
    const args = this.toBuildArgs();
    const commandSuffix = checkMissingArgs("BuildCommand", args.buildCommand).trim();
    const command = `${this.buildPrefix} ${commandSuffix}`;
    try {
      const output = await execute(command, args.src, this.context.logProvider);
      await this.context.logProvider.debug(`execute ${command} output is ${output}`);
    } catch (e) {
      throw ExecuteCommandError.fromErrorOutput(
        DeployConstant.DEPLOY_ERROR_TYPE,
        [command, args.src ?? ""],
        e
      );
    }
    return BaseBuildDriver.emptyMap;
  }
}

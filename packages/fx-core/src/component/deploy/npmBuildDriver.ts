// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { checkMissingArgs } from "../utils/common";
import { execute } from "../code/utils";
import { ExecuteCommandError } from "../error/componentError";
import { BaseBuildDriver } from "./baseBuildDriver";
import { Service } from "typedi";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/buildAndDeployArgs";

@Service("build/npm")
export class NpmBuildDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Map<string, string>> {
    const impl = new NpmBuildDriverImpl(args, context);
    return await impl.run();
  }
}

export class NpmBuildDriverImpl extends BaseBuildDriver {
  private static readonly emptyMap = new Map<string, string>();
  private static readonly NPM_BUILD_COMMAND_PREFIX = "npm ";

  async run(): Promise<Map<string, string>> {
    const args = this.toBuildArgs();
    const commandSuffix = checkMissingArgs("BuildCommand", args.buildCommand);
    const command = `${NpmBuildDriverImpl.NPM_BUILD_COMMAND_PREFIX} ${commandSuffix}`;
    try {
      const output = await execute(command, args.src, this.context.logProvider);
      await this.context.logProvider.debug(`execute ${command} output is ${output}`);
    } catch (e) {
      throw ExecuteCommandError.fromErrorOutput([command, args.src ?? ""], e);
    }
    return NpmBuildDriverImpl.emptyMap;
  }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { execute } from "../code/utils";
import { checkMissingArgs } from "../utils/common";
import { ExecuteCommandError } from "../error/componentError";
import { BaseBuildDriver } from "./baseBuildDriver";
import { Service } from "typedi";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";

@Service("build/dotnet")
export class DotnetBuildDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Map<string, string>> {
    const impl = new DotnetBuildDriverImpl(args, context);
    return await impl.run();
  }
}

export class DotnetBuildDriverImpl extends BaseBuildDriver {
  private static readonly emptyMap = new Map<string, string>();
  private static readonly DOTNET_BUILD_COMMAND_PREFIX = "dotnet";

  async run(): Promise<Map<string, string>> {
    const args = this.toBuildArgs();
    const commandSuffix = checkMissingArgs("BuildCommand", args.buildCommand).trim();
    const command = `${DotnetBuildDriverImpl.DOTNET_BUILD_COMMAND_PREFIX} ${commandSuffix}`;
    try {
      const output = await execute(command, args.src, this.context.logProvider);
      await this.context.logProvider.debug(`execute ${command} output is ${output}`);
    } catch (e) {
      throw ExecuteCommandError.fromErrorOutput([command, args.src ?? ""], e);
    }
    return DotnetBuildDriverImpl.emptyMap;
  }
}

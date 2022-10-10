// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseBuildDriver } from "./baseBuildDriver";
import { Service } from "typedi";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";

@Service("dotnet/command")
export class DotnetBuildDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Map<string, string>> {
    const impl = new DotnetBuildDriverImpl(args, context);
    return await impl.run();
  }
}

export class DotnetBuildDriverImpl extends BaseBuildDriver {
  buildPrefix = "dotnet";
}

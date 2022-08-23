// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BuildArgs } from "../interface/buildAndDeployArgs";
import { asFactory, asString } from "../utils/common";
import { BaseStepDriver } from "./baseStepDriver";

export abstract class BaseBuildDriver extends BaseStepDriver {
  protected static asBuildArgs = asFactory<BuildArgs>({
    src: asString,
    buildCommand: asString,
  });

  protected toBuildArgs(): BuildArgs {
    return BaseBuildDriver.asBuildArgs(this.args);
  }

  abstract run(): Promise<Map<string, string>>;
}

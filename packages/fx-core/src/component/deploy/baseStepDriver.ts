// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DriverContext } from "../interface/buildAndDeployArgs";

export abstract class BaseStepDriver {
  args: unknown;
  context: DriverContext;

  constructor(args: unknown, context: DriverContext) {
    this.args = args;
    this.context = context;
  }
}

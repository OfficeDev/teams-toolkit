// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @owner fanhu <fanhu@microsoft.com>
 */

import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { BaseBuildDriver } from "./baseBuildDriver";

export abstract class BaseBuildStepDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = this.getImpl(args, context);
    return (await impl.run()).result;
  }

  execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    const impl = this.getImpl(args, ctx);
    return impl.run();
  }

  abstract getImpl(args: unknown, context: DriverContext): BaseBuildDriver;
}

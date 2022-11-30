// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { BaseBuildDriver } from "./baseBuildDriver";
import { wrapRun, wrapSummaryWithArgs } from "../../utils/common";

export abstract class BaseBuildStepDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = this.getImpl(args, context);
    return wrapRun(
      () => impl.run(),
      () => impl.cleanup()
    );
  }

  execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    const impl = this.getImpl(args, ctx);
    return wrapSummaryWithArgs(this.run.bind(this, args, ctx), [
      ["driver.script.buildSummary", impl.getCommand() ?? "", impl.workingDirectory ?? ""],
    ]);
  }

  abstract getImpl(args: unknown, context: DriverContext): BaseBuildDriver;
}

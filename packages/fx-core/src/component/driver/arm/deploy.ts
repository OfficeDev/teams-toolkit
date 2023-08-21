// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { Service } from "typedi";
import { Constants } from "./constant";
import { deployArgs } from "./interface";
import { ArmDeployImpl } from "./deployImpl";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { WrapDriverContext, wrapRun } from "../util/wrapUtil";
import { getLocalizedString } from "../../../common/localizeUtils";

@Service(Constants.actionName) // DO NOT MODIFY the service name
export class ArmDeployDriver implements StepDriver {
  description = getLocalizedString("driver.arm.description.deploy");
  readonly progressTitle = getLocalizedString("driver.arm.deploy.progressBar.message");

  async execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    const wrapContext = new WrapDriverContext(ctx, Constants.actionName, Constants.actionName);
    const impl = new ArmDeployImpl(args as deployArgs, wrapContext);
    const wrapRes = await wrapRun(wrapContext, () => impl.run(), true);
    return wrapRes as ExecutionResult;
  }
}

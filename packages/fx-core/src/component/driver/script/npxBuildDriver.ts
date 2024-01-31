// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseBuildDriver } from "./baseBuildDriver";
import { Service } from "typedi";
import { DriverContext } from "../interface/commonArgs";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { BaseBuildStepDriver } from "./baseBuildStepDriver";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../constant/commonConstant";
import { getLocalizedString } from "../../../common/localizeUtils";
import { ExecutionResult } from "../interface/stepDriver";
import { addSWADeployTelemetry } from "../middleware/addSWADeployTelemetry";

const ACTION_NAME = "cli/runNpxCommand";

@Service(ACTION_NAME)
export class NpxBuildDriver extends BaseBuildStepDriver {
  readonly description: string = getLocalizedString("driver.script.npxDescription");

  @hooks([
    addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.SCRIPT_COMPONENT),
    addSWADeployTelemetry(ACTION_NAME),
  ])
  execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    return super.execute(args, ctx);
  }

  getImpl(args: unknown, context: DriverContext): BaseBuildDriver {
    return new NpxBuildDriverImpl(
      args,
      context,
      "https://aka.ms/teamsfx-actions/cli-run-npx-command"
    );
  }
}

export class NpxBuildDriverImpl extends BaseBuildDriver {
  buildPrefix = "npx";
}

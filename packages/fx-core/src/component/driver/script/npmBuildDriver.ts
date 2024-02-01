// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @owner fanhu <fanhu@microsoft.com>
 */

import { BaseBuildDriver } from "./baseBuildDriver";
import { Service } from "typedi";
import { DriverContext } from "../interface/commonArgs";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../constant/commonConstant";
import { BaseBuildStepDriver } from "./baseBuildStepDriver";
import { getLocalizedString } from "../../../common/localizeUtils";
import { ExecutionResult } from "../interface/stepDriver";

const ACTION_NAME = "cli/runNpmCommand";

@Service(ACTION_NAME)
export class NpmBuildDriver extends BaseBuildStepDriver {
  readonly description: string = getLocalizedString("driver.script.npmDescription");

  getImpl(args: unknown, context: DriverContext): BaseBuildDriver {
    return new NpmBuildDriverImpl(
      args,
      context,
      "https://aka.ms/teamsfx-actions/cli-run-npm-command"
    );
  }

  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.SCRIPT_COMPONENT)])
  execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    return super.execute(args, ctx);
  }
}

export class NpmBuildDriverImpl extends BaseBuildDriver {
  buildPrefix = "npm";
}

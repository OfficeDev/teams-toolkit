// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BaseBuildDriver } from "./baseBuildDriver";
import { Service } from "typedi";
import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { wrapRun } from "../../utils/common";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../constant/commonConstant";

const ACTION_NAME = "npm/command";

@Service(ACTION_NAME)
export class NpmBuildDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const impl = new NpmBuildDriverImpl(args, context);
    return wrapRun(
      () => impl.run(),
      () => impl.cleanup()
    );
  }
}

export class NpmBuildDriverImpl extends BaseBuildDriver {
  buildPrefix = "npm";
}

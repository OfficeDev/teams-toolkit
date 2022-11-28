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

const ACTION_NAME = "npx/command";

@Service(ACTION_NAME)
export class NpxBuildDriver extends BaseBuildStepDriver {
  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.DEPLOY_COMPONENT_NAME)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    return super.run(args, context);
  }

  getImpl(args: unknown, context: DriverContext): BaseBuildDriver {
    return new NpxBuildDriverImpl(args, context);
  }
}

export class NpxBuildDriverImpl extends BaseBuildDriver {
  buildPrefix = "npx";
}

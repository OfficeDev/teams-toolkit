// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { StepDriver } from "../../interface/stepDriver";
import { DriverContext } from "../../interface/commonArgs";
import { Service } from "typedi";
import { Constants } from "./constant";
import { deployArgs } from "./interface";
import { ArmDeployImpl } from "./deployImpl";
import { FxError, Result } from "@microsoft/teamsfx-api";

@Service(Constants.actionName) // DO NOT MODIFY the service name
// TODO: update it after interface change
export class ArmDeployDriver {
  public async run(
    args: deployArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    const impl = new ArmDeployImpl(args, context);
    return await impl.run();
  }
}

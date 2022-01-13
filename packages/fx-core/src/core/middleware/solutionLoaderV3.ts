// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { NextFunction } from "@feathersjs/hooks/lib";
import { Container } from "typedi";
import { v3 } from "@microsoft/teamsfx-api";
import { TeamsFxAzureSolutionNameV3 } from "../../plugins/solution/fx-solution/v3/constants";
import { CoreHookContext } from "./CoreHookContext";

export async function SolutionLoaderMW_V3(ctx: CoreHookContext, next: NextFunction) {
  if (ctx.projectSettings) {
    const solutionName = ctx.projectSettings.solutionSettings.name;
    ctx.solutionV3 = Container.get<v3.ISolution>(solutionName);
  } else {
    ctx.solutionV3 = Container.get<v3.ISolution>(TeamsFxAzureSolutionNameV3);
  }
  await next();
}

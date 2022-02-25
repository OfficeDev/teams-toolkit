// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { NextFunction } from "@feathersjs/hooks/lib";
import { Container } from "typedi";
import { CoreHookContext } from "../../core";
import { v3 } from "@microsoft/teamsfx-api";
import { BuiltInSolutionNames } from "../../plugins/solution/fx-solution/v3/constants";

export async function SolutionLoaderMW_V3(ctx: CoreHookContext, next: NextFunction) {
  ctx.solutionV3 = Container.get<v3.ISolution>(BuiltInSolutionNames.azure);
  await next();
}

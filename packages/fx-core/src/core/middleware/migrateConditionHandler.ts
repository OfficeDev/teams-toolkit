// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, Inputs } from "@microsoft/teamsfx-api";
import { InvalidV1ProjectError, NoProjectOpenedError } from "../error";
import { validateV1Project } from "../tools";

export const MigrateConditionHandlerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    ctx.result = err(NoProjectOpenedError());
    return;
  }

  const errorMessage = await validateV1Project(inputs.projectPath);
  if (errorMessage) {
    ctx.result = err(InvalidV1ProjectError(errorMessage));
    return;
  }

  await next();
  if (ctx.result?.isOk()) {
    await ctx?.self.tools.ui.reload?.();
  }
};

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err, Func, Inputs } from "@microsoft/teamsfx-api";
import { V1ProjectNotSupportedError } from "../error";
import { isMigrateFromV1Project } from "../tools";

export function SupportV1ConditionMW(supported: boolean): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (inputs.projectPath && (await isMigrateFromV1Project(inputs.projectPath)) && !supported) {
      const func = ctx.arguments[0] as Func;
      if (ctx.method !== "executeUserTask" || func?.namespace === "fx-solution-azure") {
        ctx.result = err(V1ProjectNotSupportedError());
        return;
      }
    }

    await next();
  };
}

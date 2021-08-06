// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { NextFunction, Middleware } from "@feathersjs/hooks";
import { Inputs, StaticPlatforms } from "@microsoft/teamsfx-api";
import { CoreHookContext, FxCore } from "..";
import { environmentManager } from "../environment";

/**
 * This middleware will help to persist environment profile if necessary.
 */
export const EnvInfoWriterMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  try {
    await next();
  } finally {
    const lastArg = ctx.arguments[ctx.arguments.length - 1];
    const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
    if (
      !inputs.projectPath ||
      inputs.ignoreConfigPersist === true ||
      StaticPlatforms.includes(inputs.platform)
    )
      return;

    const solutionContext = ctx.solutionContext;
    if (solutionContext === undefined) return;
    const envProfilePath = await environmentManager.writeEnvProfile(
      solutionContext.config,
      inputs.projectPath,
      solutionContext.targetEnvName,
      solutionContext.cryptoProvider
    );

    const core = ctx.self as FxCore;
    core.tools.logProvider.debug(`[core] persist env profile: ${envProfilePath}`);
  }
};

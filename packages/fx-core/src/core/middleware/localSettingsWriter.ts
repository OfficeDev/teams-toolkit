// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { NextFunction, Middleware } from "@feathersjs/hooks";
import { Inputs, StaticPlatforms } from "@microsoft/teamsfx-api";
import { CoreHookContext, FxCore } from "..";
import { isMultiEnvEnabled } from "../../common";
import { LocalSettingsProvider } from "../../common/localSettingsProvider";

/**
 * This middleware will help to persist local settings if necessary.
 */
export const LocalSettingsWriterMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  if (!isMultiEnvEnabled()) return;

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
    if (solutionContext === undefined || solutionContext.localSettings === undefined) return;

    // persistent localSettings.json.
    const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath);
    await localSettingsProvider.save(solutionContext.localSettings);

    const core = ctx.self as FxCore;
    core.tools.logProvider.debug(
      `[core] persist local settings profile: ${localSettingsProvider.localSettingsFilePath}`
    );
  }
};

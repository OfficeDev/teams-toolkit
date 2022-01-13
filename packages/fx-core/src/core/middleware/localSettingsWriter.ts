// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { NextFunction, Middleware } from "@feathersjs/hooks";
import { Inputs, StaticPlatforms } from "@microsoft/teamsfx-api";
import { LocalSettingsProvider } from "../../common/localSettingsProvider";
import { TOOLS } from "../globalVars";
import { CoreHookContext } from "./CoreHookContext";
import { shouldIgnored } from "./projectSettingsLoader";

/**
 * This middleware will help to persist local settings if necessary.
 */
export const LocalSettingsWriterMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  await next();
  if (!shouldIgnored(ctx)) {
    const lastArg = ctx.arguments[ctx.arguments.length - 1];
    const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
    if (
      !inputs.projectPath ||
      inputs.ignoreConfigPersist === true ||
      StaticPlatforms.includes(inputs.platform)
    )
      return;

    const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath);

    if (ctx.localSettings === undefined) return;
    // persistent localSettings.json.
    await localSettingsProvider.saveJson(ctx.localSettings, ctx.contextV2?.cryptoProvider);

    TOOLS.logProvider.debug(
      `[core] persist local settings config file: ${localSettingsProvider.localSettingsFilePath}`
    );
  }
};

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { NextFunction, Middleware } from "@feathersjs/hooks";
import { Func } from "@microsoft/teamsfx-api";
import { Inputs, StaticPlatforms } from "@microsoft/teamsfx-api";
import { CoreHookContext, isV2, TOOLS } from "..";
import { isMultiEnvEnabled } from "../../common";
import { LocalSettingsProvider } from "../../common/localSettingsProvider";
import { shouldIgnored } from "./projectSettingsLoader";

/**
 * This middleware will help to persist local settings if necessary.
 */
export const LocalSettingsWriterMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  if (ctx.method === "executeUserTask" && (ctx.arguments[0] as Func).method != "updateManifest") {
    return;
  }
  await next();
  if (!shouldIgnored(ctx) && isMultiEnvEnabled()) {
    const lastArg = ctx.arguments[ctx.arguments.length - 1];
    const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
    if (
      !inputs.projectPath ||
      inputs.ignoreConfigPersist === true ||
      StaticPlatforms.includes(inputs.platform)
    )
      return;

    const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath);

    if (isV2()) {
      if (ctx.localSettings === undefined) return;
      // persistent localSettings.json.
      await localSettingsProvider.saveJson(ctx.localSettings, ctx.contextV2?.cryptoProvider);
    } else {
      const solutionContext = ctx.solutionContext;
      if (solutionContext === undefined || solutionContext.localSettings === undefined) return;
      // persistent localSettings.json.
      await localSettingsProvider.save(
        solutionContext.localSettings,
        ctx.solutionContext?.cryptoProvider
      );
    }

    TOOLS.logProvider.debug(
      `[core] persist local settings config file: ${localSettingsProvider.localSettingsFilePath}`
    );
  }
};

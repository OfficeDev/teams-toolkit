// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { NextFunction, Middleware } from "@feathersjs/hooks";
import { Inputs, StaticPlatforms } from "@microsoft/teamsfx-api";
import { CoreHookContext, FxCore, isV2 } from "..";
import { isMultiEnvEnabled } from "../../common";
import { PluginNames } from "../../plugins/solution/fx-solution/constants";
import { environmentManager } from "../environment";

/**
 * This middleware will help to persist environment profile even if lifecycle task throws Error.
 */
export function EnvInfoWriterMW(skip = false): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    let error1: any = undefined;
    try {
      await next();
    } catch (e) {
      error1 = e;
    }
    let error2: any = undefined;
    try {
      await writeEnvInfo(ctx, skip);
    } catch (e) {
      error2 = e;
    }
    if (error1) throw error1;
    if (error2) throw error2;
  };
}

async function writeEnvInfo(ctx: CoreHookContext, skip: boolean) {
  if (skip && isMultiEnvEnabled()) {
    return;
  }

  const lastArg = ctx.arguments[ctx.arguments.length - 1];
  const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
  if (
    !inputs.projectPath ||
    inputs.ignoreConfigPersist === true ||
    inputs.ignoreEnvInfo === true ||
    StaticPlatforms.includes(inputs.platform)
  )
    return;

  if (isV2()) {
    const envInfoV2 = ctx.envInfoV2;
    if (!envInfoV2) return;
    const provisionOutputs = envInfoV2.profile;
    if (provisionOutputs === undefined) return;
    // DO NOT persist local debug plugin config.
    if (isMultiEnvEnabled() && provisionOutputs[PluginNames.LDEBUG]) {
      delete provisionOutputs[PluginNames.LDEBUG];
    }
    const envProfilePath = await environmentManager.writeEnvProfile(
      provisionOutputs,
      inputs.projectPath,
      envInfoV2.envName,
      ctx.contextV2?.cryptoProvider
    );

    if (envProfilePath.isOk()) {
      const core = ctx.self as FxCore;
      core.tools.logProvider.debug(`[core] persist env profile: ${envProfilePath.value}`);
    }
  } else {
    const solutionContext = ctx.solutionContext;
    if (solutionContext === undefined) return;

    // DO NOT persist local debug plugin config.
    if (isMultiEnvEnabled() && solutionContext.envInfo.profile.has(PluginNames.LDEBUG)) {
      solutionContext.envInfo.profile.delete(PluginNames.LDEBUG);
    }

    const envProfilePath = await environmentManager.writeEnvProfile(
      solutionContext.envInfo.profile,
      inputs.projectPath,
      solutionContext.envInfo.envName,
      solutionContext.cryptoProvider
    );

    if (envProfilePath.isOk()) {
      const core = ctx.self as FxCore;
      core.tools.logProvider.debug(`[core] persist env profile: ${envProfilePath.value}`);
    }
  }
}

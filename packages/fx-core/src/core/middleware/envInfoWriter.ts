// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { NextFunction, Middleware } from "@feathersjs/hooks";
import { FxError, Inputs, Result, StaticPlatforms } from "@microsoft/teamsfx-api";
import { PluginNames } from "../../component/constants";
import { environmentManager } from "../environment";
import { TOOLS } from "../globalVars";
import { CoreHookContext } from "../types";
import { shouldIgnored } from "./projectSettingsLoader";

/**
 * This middleware will help to persist environment state even if lifecycle task throws Error.
 */
export function EnvInfoWriterMW(skip = false): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    if (ctx.method === "localDebug" || ctx.method === "localDebugV2") {
      skip = false;
    }

    let error1: any = undefined;
    try {
      await next();
      const res = ctx.result as Result<any, FxError>;
      if (shouldSkipWriteEnvInfo(res)) {
        return;
      }
    } catch (e) {
      if ((e as any)["name"] === "CancelProvision") throw e;
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

export function shouldSkipWriteEnvInfo(res: Result<any, FxError>): boolean {
  return res.isErr() && !!res.error.userData && !!res.error.userData.shouldSkipWriteEnvInfo;
}

async function writeEnvInfo(ctx: CoreHookContext, skip: boolean) {
  if (shouldIgnored(ctx) || skip) {
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

  const envInfoV2 = ctx.envInfoV2;
  if (!envInfoV2) return;
  const state = envInfoV2.state;
  if (state === undefined) return;
  // DO NOT persist local debug plugin config.
  if (state[PluginNames.LDEBUG]) {
    delete state[PluginNames.LDEBUG];
  }
  const envStatePath = await environmentManager.writeEnvState(
    envInfoV2.state,
    inputs.projectPath,
    ctx.contextV2!.cryptoProvider,
    envInfoV2.envName
  );

  if (envStatePath.isOk()) {
    TOOLS.logProvider.debug(`[core] persist env state: ${envStatePath.value}`);
  }
}

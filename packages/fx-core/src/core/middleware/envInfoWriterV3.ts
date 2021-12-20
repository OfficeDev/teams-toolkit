// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Middleware, NextFunction } from "@feathersjs/hooks";
import { Inputs, StaticPlatforms } from "@microsoft/teamsfx-api";
import { CoreHookContext, FxCore, TOOLS } from "..";
import { getStrings } from "../../common";
import { environmentManager } from "../environment";
import { shouldIgnored } from "./projectSettingsLoader";

/**
 * This middleware will help to persist environment state even if lifecycle task throws Error.
 */
export function EnvInfoWriterMW_V3(skip = false): Middleware {
  return async (ctx: CoreHookContext, next: NextFunction) => {
    let error1: any = undefined;
    try {
      await next();
    } catch (e) {
      if ((e as any)["name"] === getStrings().solution.CancelProvision) throw e;
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

  if (ctx.contextV2 && ctx.envInfoV3) {
    const envInfoV3 = ctx.envInfoV3;
    if (!envInfoV3) return;
    const envState = envInfoV3.state;
    if (envState === undefined) return;
    const envStatePath = await environmentManager.writeEnvState(
      envState,
      inputs.projectPath,
      ctx.contextV2.cryptoProvider,
      envInfoV3.envName,
      true
    );
    if (envStatePath.isOk()) {
      TOOLS?.logProvider.debug(`[core] persist env state: ${envStatePath.value}`);
    }
  }
}

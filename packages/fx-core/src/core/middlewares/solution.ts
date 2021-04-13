// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err } from "fx-api";
import { Loader } from "../loader";
import { CoreContext } from "../context";

/**
 * This middleware will help to load solutions dynamicly in the future.
 */
export const solutionMW: Middleware = async (
    ctx: HookContext,
    next: NextFunction,
) => {
    console.log("loadsolutions");
    for (const i in ctx.arguments) {
        if (ctx.arguments[i] instanceof CoreContext) {
            const coreCtx = ctx.arguments[i] as CoreContext;

            const loadResult = await Loader.loadSolutions();
            if (loadResult.isErr()) {
                ctx.result = err(loadResult.error);
                return;
            }
            coreCtx.globalSolutions = loadResult.value;

            ctx.arguments[i] = coreCtx;
        }
    }
    await next();
};

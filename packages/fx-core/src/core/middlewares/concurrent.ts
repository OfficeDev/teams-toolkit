// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err } from "fx-api";
import { InProcessingError } from "../error";

/* eslint-disable @typescript-eslint/no-var-requires */
const lockfile = require("proper-lockfile");
/* eslint-enable  @typescript-eslint/no-var-requires */

/**
 * Currently, we can only run lifecycle in sequence. Return InProcessingError if one API
 * is called when another's in processing.
 */
export const concurrentMW: Middleware = async (
    ctx: HookContext,
    next: NextFunction,
) => {
    console.log("in concurrentMW");
    const lf = `${process.cwd()}/.mods`;
    await lockfile
        .lock(lf)
        .then(async () => {
            await next();
            return lockfile.unlock(lf);
        })
        .catch((e: Error) => {
            console.log(e);
            ctx.result = err(InProcessingError());
            return;
        });
};

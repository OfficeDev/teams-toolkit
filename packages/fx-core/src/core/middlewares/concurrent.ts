// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {HookContext, NextFunction, Middleware} from "@feathersjs/hooks";
import {err, ConfigFolderName, Context} from "fx-api";
import {InProcessingError, InternalError} from "../error";

/* eslint-disable @typescript-eslint/no-var-requires */
const lockfile = require("proper-lockfile");
/* eslint-enable  @typescript-eslint/no-var-requires */

/**
 * Currently, we can only run lifecycle in sequence. Return InProcessingError if one API
 * is called when another's in processing.
 */
export const concurrentMW: Middleware = async (
    ctx: HookContext,
    next: NextFunction
) => {
    let coreCtx: Context;

    for (const i in ctx.arguments) {
        if (isContext(ctx.arguments[i])) {
            coreCtx = ctx.arguments[i];
            break;
        }
    }

    if (coreCtx! === undefined) {
        ctx.result = err(InternalError());
        return;
    }

    const lf = `${coreCtx.root}/.${ConfigFolderName}`;
    await lockfile
        .lock(lf)
        .then(async () => {
            try {
                await next();
            } catch (e) {
                ctx.result = err(e);
                return lockfile.unlock(lf);
            }
            return lockfile.unlock(lf);
        })
        .catch((e: Error) => {
            ctx.result = err(InProcessingError());
            return;
        });
};

function isContext(object: any): object is Context {
    return "root" in object;
}

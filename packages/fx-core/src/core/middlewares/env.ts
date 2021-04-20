// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import * as fs from "fs-extra";
import { ConfigFolderName, ProjectSettings, Stage } from "fx-api";

import { CoreContext } from "../context";

/**
 * this middleware will load env from launch.json which is critical for subsequence flow.
 */
export const envMW: Middleware = async (
    ctx: HookContext,
    next: NextFunction
) => {
    for (const i in ctx.arguments) {
        if (ctx.arguments[i] instanceof CoreContext) {
            const coreCtx = ctx.arguments[i] as CoreContext;
            if (coreCtx.stage === Stage.create) {
                break;
            }

            const laungh: ProjectSettings = await fs.readJson(
                `${coreCtx.root}/.${ConfigFolderName}/settings.json`,
                { encoding: "utf-8" }
            );
            coreCtx.env = laungh.currentEnv
            ctx.arguments[i] = coreCtx;
            break;
        }
    }

    await next();
};

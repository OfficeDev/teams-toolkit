// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import * as fs from "fs-extra";
import { err, SolutionConfig, ConfigMap, ConfigFolderName } from "fx-api";
import * as error from "../error";
import { objectToConfigMap, mapToJson } from "../tools";
import { Settings } from "../settings";
import { InternalError } from "../error";
import { CoreContext } from "../context";

/**
 * This middleware will help to load configs at beginning.
 */
export const readConfigMW: Middleware = async (
    ctx: HookContext,
    next: NextFunction,
) => {
    let coreCtx: CoreContext;

    for (const i in ctx.arguments) {
        if (ctx.arguments[i] instanceof CoreContext) {
            coreCtx = ctx.arguments[i];
            break;
        }
    }

    if (coreCtx! === undefined) {
        ctx.result = err(InternalError());
        return;
    }

    console.log("loadconfig");
    const configs: Map<string, SolutionConfig> = new Map();
    let answers: ConfigMap;
    let settings: Settings;
    try {
        // load configs
        const reg = /env\.(\w+)\.json/;
        for (const file of fs.readdirSync(
            `${coreCtx.root}/.${ConfigFolderName}`,
        )) {
            const slice = reg.exec(file);
            if (!slice) {
                continue;
            }
            const filePath = `${coreCtx.root}/.${ConfigFolderName}/${file}`;
            const config: SolutionConfig = await fs.readJson(filePath);
            configs.set(slice[1], config);
        }

        // read answers
        const answerFile = `${coreCtx.root}/.${ConfigFolderName}/answers.json`;
        const answersObj: any = await fs.readJSON(answerFile);
        answers = objectToConfigMap(answersObj);

        // read settings.json to set solution & env & global configs.
        const settingsFile = `${coreCtx.root}/.${ConfigFolderName}/settings.json`;
        settings = await fs.readJSON(settingsFile);
    } catch (e) {
        ctx.result = err(error.ReadFileError(e));
        return;
    }

    for (const i in ctx.arguments) {
        if (ctx.arguments[i] instanceof CoreContext) {
            const coreCtx = ctx.arguments[i] as CoreContext;
            coreCtx.configs = configs;
            coreCtx.env = settings.currentEnv;
            coreCtx.answers = answers;

            for (const entry of coreCtx.globalSolutions.entries()) {
                if (entry[0] === settings.selectedSolution.name) {
                    coreCtx.selectedSolution = entry[1];
                    break;
                }
            }

            ctx.arguments[i] = coreCtx;
        }
    }
    await next();
};

/**
 * This middleware will help to persist configs if necessary.
 */
export const writeConfigMW: Middleware = async (
    ctx: HookContext,
    next: NextFunction,
) => {
    await next();
    console.log("writeconfig");

    let coreCtx: CoreContext;

    for (const i in ctx.arguments) {
        if (ctx.arguments[i] instanceof CoreContext) {
            coreCtx = ctx.arguments[i];
            break;
        }
    }

    if (coreCtx! === undefined) {
        ctx.result = err(InternalError());
        return;
    }

    try {
        for (const entry of coreCtx.configs.entries()) {
            const filePath = `${coreCtx.root}/.${ConfigFolderName}/env.${entry[0]}.json`;
            const content = JSON.stringify(mapToJson(entry[1]), null, 4);
            await fs.writeFile(filePath, content);
        }

        const file = `${coreCtx.root}/.${ConfigFolderName}/answers.json`;
        await fs.writeFile(file, JSON.stringify(coreCtx.answers, null, 4));
        console.log(coreCtx.answers);

        const settings: Settings = {
            selectedSolution: {
                name: coreCtx.selectedSolution!.name,
                version: coreCtx.selectedSolution!.version,
            },
            currentEnv: coreCtx.env!,
        };
        console.log(settings);
        await fs.writeFile(
            `${coreCtx.root}/.${ConfigFolderName}/settings.json`,
            JSON.stringify(settings, null, 4),
        );
    } catch (e) {
        console.log(e);
        ctx.result = err(error.ReadFileError(e));
        return;
    }
};

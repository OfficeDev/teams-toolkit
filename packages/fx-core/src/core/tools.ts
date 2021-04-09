// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { exec } from "child_process";
import * as fs from "fs-extra";
import * as os from "os";
import { ConfigMap, Json, SolutionContext, TeamsAppManifest } from "fx-api";
import { promisify } from "util";
import { CoreContext } from "./context";
import { CoreQuestionNames } from "./question";
import { VscodeManager } from "./vscodeManager";

const execAsync = promisify(exec);

export async function npmInstall(path: string) {
    await execAsync("npm install", {
        cwd: path,
    });
}

export async function ensureUniqueFolder(folderPath: string): Promise<string> {
    let folderId = 1;
    let testFolder = folderPath;

    let pathExists = await fs.pathExists(testFolder);
    while (pathExists) {
        testFolder = `${folderPath}${folderId}`;
        folderId++;

        pathExists = await fs.pathExists(testFolder);
    }

    return testFolder;
}

/**
 * Convert a `Map` to a Json recursively.
 * @param {Map} map to convert.
 * @returns {Json} converted Json.
 */
export function mapToJson(map: Map<any, any>): Json {
    const out: Json = {};
    for (const entry of map.entries()) {
        if (entry[1] instanceof Map) {
            out[entry[0]] = mapToJson(entry[1]);
        } else {
            out[entry[0]] = entry[1];
        }
    }
    return out;
}

/**
 * Convert an `Object` to a Map recursively
 * @param {Json} Json to convert.
 * @returns {Map} converted Json.
 */
export function objectToMap(o: Json): Map<any, any> {
    const m = new Map();
    for (const entry of Object.entries(o)) {
        if (entry[1] instanceof Array) {
            m.set(entry[0], entry[1]);
        } else if (entry[1] instanceof Object) {
            m.set(entry[0], objectToConfigMap(entry[1] as Json));
        } else {
            m.set(entry[0], entry[1]);
        }
    }
    return m;
}

/**
 * @param {Json} Json to convert.
 * @returns {Map} converted Json.
 */
export function objectToConfigMap(o?: Json): ConfigMap {
    const m = new ConfigMap();
    if (o) {
        for (const entry of Object.entries(o)) {
            {
                m.set(entry[0], entry[1]);
            }
        }
    }
    return m;
}

export function mergeConfigMap(
    source?: ConfigMap,
    target?: ConfigMap,
): ConfigMap {
    const map = new ConfigMap();
    if (source) {
        for (const entry of source) {
            map.set(entry[0], entry[1]);
        }
    }
    if (target) {
        for (const entry of target) {
            map.set(entry[0], entry[1]);
        }
    }
    return map;
}

export function contextTosolutionContext(
    ctx: CoreContext,
    answers?: ConfigMap,
): SolutionContext {
    const allAnswers = mergeConfigMap(ctx.globalConfig, ctx.answers);
    const stage = allAnswers?.getString(CoreQuestionNames.Stage);
    const substage = allAnswers?.getString(CoreQuestionNames.SubStage);
    let sCtx: SolutionContext;
    if (
        "create" === stage &&
        ("getQuestions" === substage || "askQuestions" === substage)
    ) {
        // for create stage, SolutionContext is new and clean
        sCtx = {
            ...ctx,
            answers: allAnswers,
            app: new TeamsAppManifest(),
            config: new Map<string, ConfigMap>(),
            dotVsCode: VscodeManager.getInstance(),
            root: os.homedir() + "/teams_app/",
        };
    } else {
        sCtx = {
            ...ctx,
            answers: mergeConfigMap(allAnswers, answers),
            app: new TeamsAppManifest(),
            config: ctx.configs.get(ctx.env)!,
            dotVsCode: VscodeManager.getInstance(),
        };
    }
    return sCtx;
}

/**
 * Deep copy function for TypeScript.
 * @param T Generic type of target/copied value.
 * @param target Target value to be copied.
 * @see Source project, ts-deepcopy https://github.com/ykdr2017/ts-deepcopy
 * @see Code pen https://codepen.io/erikvullings/pen/ejyBYg
 */
export const deepCopy = <T>(target: T): T => {
    if (target === null) {
        return target;
    }
    if (target instanceof Date) {
        return new Date(target.getTime()) as any;
    }
    if (target instanceof Array) {
        const cp = [] as any[];
        (target as any[]).forEach((v) => {
            cp.push(v);
        });
        return cp.map((n: any) => deepCopy<any>(n)) as any;
    }
    if (typeof target === "object" && target !== {}) {
        const cp = { ...(target as { [key: string]: any }) } as {
            [key: string]: any;
        };
        Object.keys(cp).forEach((k) => {
            cp[k] = deepCopy<any>(cp[k]);
        });
        return cp as T;
    }
    return target;
};

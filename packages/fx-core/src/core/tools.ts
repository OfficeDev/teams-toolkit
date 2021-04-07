// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { exec } from "child_process";
import * as fs from "fs-extra";
import { ConfigMap, Json } from "fx-api";
import { promisify } from "util";

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

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Base64 } from "js-base64";
import { Uuid } from "node-ts-uuid";
import { exec } from "child_process";
import { default as urlParse } from "url-parse";
import AdmZip from "adm-zip";

import { ConfigValue, PluginContext, IBot } from "fx-api";
import { RegularExprs, WebAppConstants } from "../constants";

export function toBase64(source: string): string {
    return Base64.encode(source);
}

export function genUUID(): string {
    return Uuid.generate();
}

export function zipAFolder(sourceDir: string, notIncluded: string[]): Buffer {
    const zip = new AdmZip();
    zip.addLocalFolder(sourceDir, "", (filename: string) => {
        const result = notIncluded.find((notIncludedItem) => {
            return filename.startsWith(notIncludedItem);
        });

        return !result;
    });

    return zip.toBuffer();
}

export function isNameValidInUrl(name: string): boolean {
    const reg: RegExp = RegularExprs.NORMAL_NAME;
    return reg.test(name);
}

export function isDomainValidForAzureWebApp(url: string): boolean {
    return urlParse(url).hostname.endsWith(WebAppConstants.WEB_APP_SITE_DOMAIN);
}

export async function execute(command: string, workingDir?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!workingDir) {
            workingDir = __dirname;
        }
        exec(command, { cwd: workingDir }, (error, standardOutput) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(standardOutput);
        });
    });
}

export function checkAndSaveConfig(context: PluginContext, key: string, value: ConfigValue): void {
    if (!value) {
        return;
    }

    context.config.set(key, value);
}

export function existsInEnumValues<T extends string>(value: string, targetEnum: { [key: string]: T }): boolean {
    return Object.values(targetEnum).find((itemValue: string) => value === itemValue) !== undefined;
}

export function isHttpCodeOkOrCreated(code: number): boolean {
    return [200, 201].includes(code);
}

export function genBotSectionInManifest(botId: string): string {
    const botSection: IBot[] = [{
        botId: botId,
        scopes: ["personal", "team", "groupchat"],
        supportsFiles: false,
        isNotificationOnly: false
    }];
    return JSON.stringify(botSection);
}

export function pathInZipArchive(zip: AdmZip, path: string): boolean {
    return zip.getEntries().find((value) => value.entryName === path) !== undefined;
}

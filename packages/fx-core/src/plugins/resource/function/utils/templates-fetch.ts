// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import * as path from "path";
import AdmZip from "adm-zip";
import axios, { AxiosResponse } from "axios";
import semver from "semver";

import {
    BadTemplateManifestError,
    TemplateManifestNetworkError,
    TemplateZipNetworkError,
    UnzipError,
    runWithErrorCatchAndThrow
} from "../resources/errors";
import { DefaultValues } from "../constants";
import { InfoMessages } from "../resources/message";
import { Logger } from "./logger";

// group -> programming language -> scenario -> version + url
export type Manifest = {
    [key:string]: {
        [key: string]: {
            [key: string]: {
                version: string;
                url: string
            }[]
        }
    }
};

async function fetchTemplateManifest(manifestUrl: string): Promise<Manifest> {
    return await runWithErrorCatchAndThrow(new TemplateManifestNetworkError(manifestUrl), async () => {
        const res: AxiosResponse<Manifest> = await requestWithRetry(
            DefaultValues.scaffoldTryCount,
            async () => {
                return await axios.get(manifestUrl, {
                    timeout: DefaultValues.scaffoldTimeoutInMs
                });
            }
        );
        return res.data;
    });
}

export async function getTemplateURL(
    manifestUrl: string, group: string, language: string,
    scenario: string, version: string): Promise<string> {

    const manifest: Manifest = await fetchTemplateManifest(manifestUrl);
    const url = await runWithErrorCatchAndThrow(new BadTemplateManifestError(`${group}+${language}+${scenario}+${version}`),
        () => {
            // The format from website may be incorrect, parse it inside try-catch block
            const urls: {version: string, url: string}[] =
                manifest[group][language][scenario]
                    .filter(x => semver.satisfies(x.version, version))
                    .sort((a, b) => -semver.compare(a.version, b.version));
            return urls[0].url;
        });

    return url;
}

export async function fetchZipFromURL(url: string): Promise<AdmZip> {
    return await runWithErrorCatchAndThrow(new TemplateZipNetworkError(url), async () => {
        const res: AxiosResponse<any> = await requestWithRetry(
            DefaultValues.scaffoldTryCount,
            async () => {
                return await axios.get(url, {
                    responseType: "arraybuffer",
                    timeout: DefaultValues.scaffoldTimeoutInMs
                });
            }
        );

        const zip = new AdmZip(res.data);
        return zip;
    });
}

/* The unzip used for scaffold which would drop the attr of the files and dirs. */
export async function unzip(
    zip: AdmZip, dstPath: string,
    nameReplaceFn?: (filePath: string, data: Buffer) => string,
    dataReplaceFn?: (filePath: string, data: Buffer) => Buffer | string): Promise<void> {

    await runWithErrorCatchAndThrow(new UnzipError(), async () => {
        const entries: AdmZip.IZipEntry[] = zip.getEntries().filter(entry => !entry.isDirectory);

        for (const entry of entries) {
            const rawEntryData: Buffer = entry.getData();
            const entryName: string = nameReplaceFn ? nameReplaceFn(entry.entryName, rawEntryData) : entry.entryName;
            const entryData: string | Buffer = dataReplaceFn ? dataReplaceFn(entry.name, rawEntryData) : rawEntryData;

            const filePath: string = path.join(dstPath, entryName);
            const dirPath: string = path.dirname(filePath);
            await fs.ensureDir(dirPath);
            await fs.writeFile(filePath, entryData);
            Logger.debug(InfoMessages.functionScaffoldAt(filePath));
        }
    });
}

export async function requestWithRetry<T>(
    maxTryCount: number,
    requestFn: () => Promise<AxiosResponse<T>>
    ): Promise<AxiosResponse<T>> {
    // !status means network error, see https://github.com/axios/axios/issues/383
    const canTry = (status: number | undefined) => (!status || (status >= 500 && status < 600));

    let error: Error = new Error(`RequestWithRetry got bad max try number ${maxTryCount}`);
    let tryCount = 0;

    while (tryCount++ < maxTryCount) {
        try {
            const res = await requestFn();
            if (res.status === 200 || res.status === 201) {
                return res;
            }

            error = new Error(`HTTP Request failed: ${JSON.stringify(res)}`);

            if (!canTry(res.status)) {
                break;
            }
        } catch (e) {
            error = e;

            if (!canTry(e.response?.status)) {
                break;
            }
        }
    }

    throw error;
}

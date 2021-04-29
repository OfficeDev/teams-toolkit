// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import AdmZip from "adm-zip";
import Mustache from "mustache";
import axios from "axios";
import fs from "fs-extra";
import semver from "semver";

import {
    FetchTemplateManifestError,
    FetchTemplatePackageError,
    InvalidTemplateManifestError,
    runWithErrorCatchAndThrow,
} from "../resources/errors";
import { Constants, FrontendPathInfo, FrontendPluginInfo as PluginInfo } from "../constants";
import { Logger } from "../utils/logger";
import { Messages } from "../resources/messages";
import { PluginContext } from "fx-api";
import { Utils } from "../utils";
import { telemetryHelper } from "../utils/telemetry-helper";
import { TemplateInfo, TemplateVariable } from "../resources/templateInfo";

export type Manifest = {
    [key: string]: {
        [key: string]: {
            [key: string]: {
                version: string;
                url: string;
            }[];
        };
    };
};

export class FrontendScaffold {
    public static async fetchTemplateManifest(url: string): Promise<Manifest> {
        const result = await runWithErrorCatchAndThrow(
            new FetchTemplatePackageError(),
            () =>
                Utils.requestWithRetry(async () => {
                    return axios.get(url);
                })
        );
        if (!result) {
            throw new FetchTemplatePackageError();
        }
        return result.data;
    }

    public static async getTemplateURL(
        manifestUrl: string,
        group: string,
        language: string,
        scenario: string,
        version: string
    ): Promise<string> {
        const manifest: Manifest = await this.fetchTemplateManifest(manifestUrl);
        return runWithErrorCatchAndThrow(new InvalidTemplateManifestError(), () => {
            const urls: { version: string; url: string }[] = manifest[group][language][scenario]
                .filter((x) => semver.satisfies(x.version, version))
                .sort((a, b) => -semver.compare(a.version, b.version));
            return urls[0].url;
        });
    }

    public static async fetchZipFromUrl(url: string): Promise<AdmZip> {
        const result = await runWithErrorCatchAndThrow(
            new FetchTemplateManifestError(),
            () =>
                Utils.requestWithRetry(async () => {
                    return axios.get(url, {
                        responseType: "arraybuffer",
                        timeout: Constants.RequestTimeoutInMS,
                    });
                })
        );

        if (!result) {
            throw new FetchTemplatePackageError();
        }
        return new AdmZip(result.data);
    }

    public static getTemplateZipFromLocal(templateInfo: TemplateInfo): AdmZip {
        const templatePath = path.resolve(FrontendPathInfo.RootDir, templateInfo.localTemplatePath);
        return new AdmZip(templatePath);
    }

    public static async getTemplateZip(ctx: PluginContext, templateInfo: TemplateInfo): Promise<AdmZip> {
        try {
            // Temporarily hard code template language as JavaScript
            const templateUrl = await FrontendScaffold.getTemplateURL(
                PluginInfo.templateManifestURL,
                templateInfo.group,
                templateInfo.language,
                templateInfo.scenario,
                templateInfo.version
            );
            return await FrontendScaffold.fetchZipFromUrl(templateUrl);
        } catch (e) {
            telemetryHelper.sendErrorEvent(ctx, Messages.FailedFetchTemplate(), e);
            Logger.warning(Messages.FailedFetchTemplate());
            return FrontendScaffold.getTemplateZipFromLocal(templateInfo);
        }
    }

    public static fulfill(filePath: string, data: Buffer, variables: TemplateVariable): string | Buffer {
        if (path.extname(filePath) === FrontendPathInfo.TemplateFileExt) {
            return Mustache.render(data.toString(), variables);
        }
        return data;
    }

    public static async scaffoldFromZip(
        zip: AdmZip,
        dstPath: string,
        nameReplaceFn?: (filePath: string, data: Buffer) => string,
        dataReplaceFn?: (filePath: string, data: Buffer) => string | Buffer
    ): Promise<void> {
        await Promise.all(
            zip
                .getEntries()
                .filter((entry) => !entry.isDirectory)
                .map(async (entry) => {
                    const data: string | Buffer = dataReplaceFn ? dataReplaceFn(entry.name, entry.getData()) : entry.getData();

                    const filePath = path.join(
                        dstPath,
                        nameReplaceFn ? nameReplaceFn(entry.entryName, entry.getData()) : entry.entryName
                    );
                    await fs.ensureDir(path.dirname(filePath));
                    await fs.writeFile(filePath, data);
                })
        );
    }
}

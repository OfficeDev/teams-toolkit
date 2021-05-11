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
import { PluginContext } from "@microsoft/teamsfx-api";
import { Utils } from "../utils";
import { telemetryHelper } from "../utils/telemetry-helper";
import { TemplateInfo, TemplateVariable } from "../resources/templateInfo";
import { selectTag, tagListURL, templateURL } from "../../../../common/templates";

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
    public static async fetchTemplateTagList(url: string): Promise<string> {
        const result = await runWithErrorCatchAndThrow(
            new FetchTemplateManifestError(),
            async () => await Utils.requestWithRetry(async () => {
                return axios.get(url, {
                    timeout: Constants.RequestTimeoutInMS,
                });
            }, Constants.ScaffoldTryCounts)
        );
        if (!result) {
            throw new FetchTemplateManifestError();
        }
        return result.data;
    }

    public static async getTemplateURL(
        manifestUrl: string,
        templateBaseName: string,
    ): Promise<string> {
        const tags: string = await this.fetchTemplateTagList(manifestUrl);
        const selectedTag = selectTag(tags.replace(/\r/g, Constants.EmptyString).split("\n"));
        if (!selectedTag) {
            throw new InvalidTemplateManifestError(templateBaseName);
        }
        return templateURL(selectedTag, templateBaseName);
    }

    public static async fetchZipFromUrl(url: string): Promise<AdmZip> {
        const result = await runWithErrorCatchAndThrow(
            new FetchTemplateManifestError(),
            async () => await Utils.requestWithRetry(async () => {
                return axios.get(url, {
                    responseType: "arraybuffer",
                    timeout: Constants.RequestTimeoutInMS,
                });
            }, Constants.ScaffoldTryCounts)
        );

        if (!result) {
            throw new FetchTemplatePackageError();
        }
        return new AdmZip(result.data);
    }

    public static getTemplateZipFromLocal(templateInfo: TemplateInfo): AdmZip {
        const templatePath = templateInfo.localTemplatePath;//path.resolve(FrontendPathInfo.RootDir, );
        return new AdmZip(templatePath);
    }

    public static async getTemplateZip(ctx: PluginContext, templateInfo: TemplateInfo): Promise<AdmZip> {
        try {
            // Temporarily hard code template language as JavaScript
            const templateUrl = await FrontendScaffold.getTemplateURL(
                tagListURL,
                templateInfo.localTemplateBaseName
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

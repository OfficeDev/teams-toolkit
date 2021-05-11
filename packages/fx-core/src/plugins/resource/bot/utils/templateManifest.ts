// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { default as axios } from "axios";
import semver from "semver";

import { ProgrammingLanguage } from "../enums/programmingLanguage";
import { DownloadConstants, TemplateProjectsConstants } from "../constants";
import { DownloadError, TemplateProjectNotFoundError } from "../errors";
import { Logger } from "../logger";
import * as utils from "../utils/common";

export const templatesVersion = "0.1.*";
export const tagPrefix = "templates@";
export const preRelease = process.env.TEAMSFX_TEMPLATE_PRERELEASE || "";
export const tagListURL =
    "https://github.com/OfficeDev/TeamsFx/releases/download/template-tag-list/template-tags.txt";

export function selectTag(tags: string[]): string | undefined {
    const versionPattern = preRelease ? `0.0.0-${preRelease}` : templatesVersion;
    const versionList = tags.map((tag: string) => tag.replace(tagPrefix, ""));
    const selectedVersion = semver.maxSatisfying(versionList, versionPattern);
    return selectedVersion ? (tagPrefix + selectedVersion) : undefined;
}

export const templateURL = (tag: string, templateName: string): string =>
    `https://github.com/OfficeDev/TeamsFx/releases/download/${tag}/${templateName}.zip`;


export class TemplateManifest {
    public tags: string[] = [];

    public static async newInstance(): Promise<TemplateManifest> {
        const ret = new TemplateManifest();

        let res = undefined;

        try {
            res = await axios.get(tagListURL, {
                timeout: DownloadConstants.TEMPLATES_TIMEOUT_MS
            });
        } catch (e) {
            throw new DownloadError(tagListURL, e);
        }

        if (!res || res.status !== 200) {
            throw new DownloadError(tagListURL);
        }

        ret.tags = res.data.replace(/\r/g, "").split("\n");

        return ret;
    }

    public getNewestTemplateUrl(
        lang: ProgrammingLanguage,
        group_name: string,
        scenario = TemplateProjectsConstants.DEFAULT_SCENARIO_NAME,
    ): string {
        Logger.debug(`getNewestTemplateUrl for ${lang},${group_name},${scenario}.`);

        const langKey = utils.convertToLangKey(lang);

        const selectedTag = selectTag(this.tags);
        if (!selectedTag) {
            throw new TemplateProjectNotFoundError();
        }

        return templateURL(selectedTag, `${group_name}.${langKey}.${scenario}`);
    }
}

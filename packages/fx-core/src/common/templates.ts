// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as semver from "semver";
import * as config from "./templates-config.json";

export const templatesVersion = config.version;
export const tagPrefix = config.tagPrefix;
export const preRelease = process.env.TEAMSFX_TEMPLATE_PRERELEASE || "";
export const tagListURL = config.tagListURL;

export function selectTag(tags: string[]): string | undefined {
    const versionPattern = preRelease ? `0.0.0-${preRelease}` : templatesVersion;
    const versionList = tags.map((tag: string) => tag.replace(tagPrefix, ""));
    const selectedVersion = semver.maxSatisfying(versionList, versionPattern);
    return selectedVersion ? (tagPrefix + selectedVersion) : undefined;
}

export const templateURL = (tag: string, templateName: string) : string =>
    `${config.templateDownloadBaseURL}/${tag}/${templateName}.zip`;

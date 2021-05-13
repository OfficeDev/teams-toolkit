// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as semver from "semver";

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

export const templateURL = (tag: string, templateName: string) : string =>
    `https://github.com/OfficeDev/TeamsFx/releases/download/${tag}/${templateName}.zip`;

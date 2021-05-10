// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Alias, RegularExprs } from "../constants";

export class ResourceNameFactory {
    public static createCommonName(appName: string, suffix: string, limit?: number): string {
        const normalizedAppName = appName.replace(RegularExprs.CHARS_TO_BE_SKIPPED, "").toLowerCase();
        const lowerAlias = Alias.TEAMS_BOT_PLUGIN.toLowerCase();

        let candidate = `${normalizedAppName}${lowerAlias}${suffix}`;

        if (limit && candidate.length > limit) {
            candidate = candidate.substr(candidate.length - limit);
        }

        return candidate;
    }
}
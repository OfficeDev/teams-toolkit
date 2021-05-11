// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Alias, RegularExprs } from "../constants";
import { SomethingMissingError } from "../errors";
import { CommonStrings } from "../resources/strings";

export class ResourceNameFactory {
    public static createCommonName(suffix: string, appName?: string, limit?: number): string {
        if (!appName) {
            throw new SomethingMissingError(CommonStrings.SHORT_APP_NAME);
        }
        const normalizedAppName = appName.replace(RegularExprs.CHARS_TO_BE_SKIPPED, "").toLowerCase();
        const lowerAlias = Alias.TEAMS_BOT_PLUGIN.toLowerCase();

        let candidate = `${normalizedAppName}${lowerAlias}${suffix}`;

        if (limit && candidate.length > limit) {
            candidate = candidate.substr(candidate.length - limit);
        }

        return candidate;
    }
}
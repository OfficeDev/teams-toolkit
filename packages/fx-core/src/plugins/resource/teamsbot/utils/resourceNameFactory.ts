import { Alias, RegularExprs } from "../constants";
import { SomethingMissingException } from "../exceptions";
import { CommonStrings } from "../resources/strings";
import * as utils from "./common";

export class ResourceNameFactory {
    public static createCommonName(appName: string | undefined, limit?: number): string {
        if (!appName) {
            throw new SomethingMissingException(CommonStrings.SHORT_APP_NAME);
        }

        const normalizedAppName = appName.replace(RegularExprs.CHARS_TO_BE_SKIPPED, "").toLowerCase();
        const lowerAlias = Alias.TEAMS_BOT_PLUGIN.toLowerCase();

        let candidate = `${normalizedAppName}${lowerAlias}${utils.genUUID()}`;

        if (limit && candidate.length > limit) {
            candidate = candidate.substr(candidate.length - limit);
        }

        return candidate;
    }
}
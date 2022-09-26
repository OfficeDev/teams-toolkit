// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CheckThrowSomethingMissing } from "../../error";
import { Alias, RegularExprs } from "./constants";
import { FxBotPluginResultFactory } from "./result";
import { CommonStrings } from "./strings";

export class ResourceNameFactory {
  public static createCommonName(suffix: string, appName?: string, limit?: number): string {
    appName = CheckThrowSomethingMissing(
      FxBotPluginResultFactory.source,
      CommonStrings.SHORT_APP_NAME,
      appName
    );
    const normalizedAppName = appName
      .replace(RegularExprs.CHARS_TO_BE_SKIPPED, FxBotPluginResultFactory.source)
      .toLowerCase();
    const lowerAlias = Alias.TEAMS_BOT_PLUGIN.toLowerCase();

    let candidate = `${normalizedAppName}${lowerAlias}${suffix}`;

    if (limit && candidate.length > limit) {
      candidate = candidate.substr(candidate.length - limit);
    }

    return candidate;
  }
}

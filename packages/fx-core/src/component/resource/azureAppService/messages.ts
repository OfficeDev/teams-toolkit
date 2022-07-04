// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";

export class Messages {
  public static readonly SomethingIsMissing = (something: string): [string, string] => [
    getDefaultString("plugins.bot.SomethingIsMissing", something),
    getLocalizedString("plugins.bot.SomethingIsMissing", something),
  ];
  public static readonly SomethingIsNotExisting = (something: string): [string, string] => [
    getDefaultString("plugins.bot.SomethingNotExisting", something),
    getLocalizedString("plugins.bot.SomethingNotExisting", something),
  ];
  public static readonly WorkingDirIsMissing: [string, string] = [
    getDefaultString("plugins.bot.WorkingDirMissing"),
    getLocalizedString("plugins.bot.WorkingDirMissing"),
  ];

  // Suggestions
  public static readonly RetryTheCurrentStep = getLocalizedString(
    "suggestions.retryTheCurrentStep"
  );
  public static readonly RecreateTheProject: [string, string] = [
    getDefaultString("plugins.bot.RecreateProject"),
    getLocalizedString("plugins.bot.RecreateProject"),
  ];
  public static readonly CheckOutputLogAndTryToFix = getLocalizedString(
    "plugins.bot.CheckLogAndFix"
  );
  public static readonly ReopenWorkingDir = (path = ""): string =>
    getLocalizedString("plugins.bot.CheckPathWriteAccess", path);
}

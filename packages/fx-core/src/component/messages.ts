// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getLocalizedString } from "../common/localizeUtils";

export class ProgressTitles {
  static readonly create = getLocalizedString("core.progress.create");
}

export class ProgressMessages {
  static readonly generateTemplate = getLocalizedString("core.progress.createFromTemplate");
  static readonly generateSample = (sampleName: string): string =>
    getLocalizedString("core.progress.createFromSample", sampleName);
  static readonly configureAzureStorageEnableStaticWebsite = getLocalizedString(
    "core.progress.configureAzureStorage"
  );
  static readonly runCommand = (command: string, directory: string): string =>
    getLocalizedString("core.progress.runCommand", command, directory);
  static readonly deployToAzure = (location: string, dist: string): string =>
    getLocalizedString("core.progress.deployToAzure", location, dist);
}

export class LogMessages {
  public static readonly getTemplateFromLocal = getLocalizedString(
    "plugins.function.getTemplateFromLocal"
  );
}

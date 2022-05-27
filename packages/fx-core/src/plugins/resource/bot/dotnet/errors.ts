// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { getLocalizedString, getDefaultString } from "../../../../common/localizeUtils";
import { ErrorType, PluginError } from "../errors";

const tips = {
  checkLog: getLocalizedString("plugins.dotnet.checkLog"),
  checkFsPermissions: getLocalizedString("plugins.dotnet.checkFsPermissions"),
};

export class FileIOError extends PluginError {
  constructor(path: string) {
    super(
      ErrorType.USER,
      "FileIOError",
      [
        getDefaultString("error.dotnet.FileIOError", path),
        getLocalizedString("error.dotnet.FileIOError", path),
      ],
      [tips.checkFsPermissions, tips.checkLog]
    );
  }
}

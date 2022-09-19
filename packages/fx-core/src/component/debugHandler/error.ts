// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as util from "util";

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";

export const errorSource = "debugHandler";

export function AppManifestPackageNotExistError(appManifestPackagePath: string): UserError {
  return new UserError(
    errorSource,
    "InvalidDebugArgsError",
    util.format(
      getDefaultString("error.debugHandler.AppManifestPackageNotExistError"),
      appManifestPackagePath
    ),
    util.format(
      getLocalizedString("error.debugHandler.AppManifestPackageNotExistError"),
      appManifestPackagePath
    )
  );
}

export function InvalidAppManifestPackageFileFormatError(): UserError {
  return new UserError(
    errorSource,
    "InvalidDebugArgsError",
    getDefaultString("error.debugHandler.InvalidAppManifestPackageFileFormatError"),
    getLocalizedString("error.debugHandler.InvalidAppManifestPackageFileFormatError")
  );
}

export function DebugArgumentEmptyError(argument: string): UserError {
  return new UserError(
    errorSource,
    "InvalidDebugArgsError",
    util.format(getDefaultString("error.debugHandler.DebugArgumentEmptyError"), argument),
    util.format(getLocalizedString("error.debugHandler.DebugArgumentEmptyError"), argument)
  );
}

export function InvalidTabBaseUrlError(): UserError {
  return new UserError(
    errorSource,
    "InvalidDebugArgsError",
    getDefaultString("error.debugHandler.InvalidTabBaseUrlError"),
    getLocalizedString("error.debugHandler.InvalidTabBaseUrlError")
  );
}

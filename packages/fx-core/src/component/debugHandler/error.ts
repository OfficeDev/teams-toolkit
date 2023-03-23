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
    util.format(getDefaultString("error.common.FileNotFoundError"), appManifestPackagePath),
    util.format(getLocalizedString("error.common.FileNotFoundError"), appManifestPackagePath)
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

export function InvalidExistingAADArgsError(): UserError {
  return new UserError(
    errorSource,
    "InvalidDebugArgsError",
    getDefaultString("error.debugHandler.InvalidExistingAADArgsError"),
    getLocalizedString("error.debugHandler.InvalidExistingAADArgsError")
  );
}

export function InvalidExistingBotArgsError(): UserError {
  return new UserError(
    errorSource,
    "InvalidDebugArgsError",
    getDefaultString("error.debugHandler.InvalidExistingBotArgsError"),
    getLocalizedString("error.debugHandler.InvalidExistingBotArgsError")
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

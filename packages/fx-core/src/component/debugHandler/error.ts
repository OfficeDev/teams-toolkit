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
    "InvalidAppManifestDebugArgsError",
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
    "InvalidAppManifestDebugArgsError",
    getDefaultString("error.debugHandler.InvalidAppManifestPackageFileFormatError"),
    getLocalizedString("error.debugHandler.InvalidAppManifestPackageFileFormatError")
  );
}

export function InvalidSSODebugArgsError(): UserError {
  return new UserError(
    errorSource,
    "InvalidSSODebugArgsError",
    getDefaultString("error.debugHandler.InvalidSSODebugArgsError"),
    getLocalizedString("error.debugHandler.InvalidSSODebugArgsError")
  );
}

export function InvalidExistingBotArgsError(): UserError {
  return new UserError(
    errorSource,
    "InvalidBotDebugArgsError",
    getDefaultString("error.debugHandler.InvalidExistingBotArgsError"),
    getLocalizedString("error.debugHandler.InvalidExistingBotArgsError")
  );
}

export function BotMessagingEndpointMissingError(): UserError {
  return new UserError(
    errorSource,
    "InvalidBotDebugArgsError",
    getDefaultString("error.debugHandler.BotMessagingEndpointMissingError"),
    getLocalizedString("error.debugHandler.BotMessagingEndpointMissingError")
  );
}

export function InvalidTabDebugArgsError(): UserError {
  return new UserError(
    errorSource,
    "InvalidTabDebugArgsError",
    getDefaultString("error.debugHandler.InvalidTabDebugArgsError"),
    getLocalizedString("error.debugHandler.InvalidTabDebugArgsError")
  );
}

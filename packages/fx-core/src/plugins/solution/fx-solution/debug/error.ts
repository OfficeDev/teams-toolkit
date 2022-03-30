// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { SystemError, UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";
import { SolutionSource } from "../constants";

export function ScaffoldLocalDebugSettingsError(error: any): SystemError {
  return new SystemError({
    error,
    source: SolutionSource,
    name: "ScaffoldLocalDebugSettingsError",
  });
}

export function SetupLocalDebugSettingsError(error: any): SystemError {
  return new SystemError({ error, source: SolutionSource, name: "SetupLocalDebugSettingsError" });
}

export function ConfigLocalDebugSettingsError(error: any): SystemError {
  return new SystemError({ error, source: SolutionSource, name: "ConfigLocalDebugSettingsError" });
}

export function NgrokTunnelNotConnected(): UserError {
  return new UserError({
    name: "NgrokTunnelNotConnected",
    source: "localdebug-plugin",
    message: getDefaultString("error.NgrokTunnelNotConnected"),
    displayMessage: getLocalizedString("error.NgrokTunnelNotConnected"),
    helpLink: "https://aka.ms/teamsfx-localdebug",
  });
}

export function LocalBotEndpointNotConfigured(): UserError {
  return new UserError(
    SolutionSource,
    "LocalBotEndpointNotConfigured",
    getDefaultString("error.LocalBotEndpointNotConfigured"),
    getLocalizedString("error.LocalBotEndpointNotConfigured")
  );
}

export function InvalidLocalBotEndpointFormat(localBotEndpoint: string): UserError {
  return new UserError(
    SolutionSource,
    "InvalidLocalBotEndpointFormat",
    getDefaultString("error.LocalBotEndpointNotConfigured", localBotEndpoint),
    getLocalizedString("error.LocalBotEndpointNotConfigured", localBotEndpoint)
  );
}

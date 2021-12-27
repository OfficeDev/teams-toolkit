// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { returnSystemError, returnUserError, SystemError, UserError } from "@microsoft/teamsfx-api";
import { SolutionSource } from "../constants";

export function ScaffoldLocalDebugSettingsError(error: any): SystemError {
  return returnSystemError(error, SolutionSource, "ScaffoldLocalDebugSettingsError");
}

export function SetupLocalDebugSettingsError(error: any): SystemError {
  return returnSystemError(error, SolutionSource, "SetupLocalDebugSettingsError");
}

export function ConfigLocalDebugSettingsError(error: any): SystemError {
  return returnSystemError(error, SolutionSource, "ConfigLocalDebugSettingsError");
}

export function NgrokTunnelNotConnected(): UserError {
  return returnUserError(
    new Error("Ngrok tunnel is not connected. Check your network settings and try again."),
    "localdebug-plugin",
    "NgrokTunnelNotConnected",
    "https://aka.ms/teamsfx-localdebug"
  );
}

export function LocalBotEndpointNotConfigured(): UserError {
  return returnUserError(
    new Error(
      'Local bot endpoint is not configured. Set "fx-resource-local-debug.localBotEndpoint" in ".fx/default.user.data" and try again.'
    ),
    "localdebug-plugin",
    "LocalBotEndpointNotConfigured"
  );
}

export function InvalidLocalBotEndpointFormat(localBotEndpoint: string): UserError {
  return returnUserError(
    new Error(`Local bot endpoint format is invalid: ${localBotEndpoint}.`),
    "localdebug-plugin",
    "InvalidLocalBotEndpointFormat"
  );
}

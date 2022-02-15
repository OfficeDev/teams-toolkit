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
    SolutionSource,
    "NgrokTunnelNotConnected",
    "https://aka.ms/teamsfx-localdebug"
  );
}

export function LocalBotEndpointNotConfigured(): UserError {
  return returnUserError(
    new Error(
      'Local bot endpoint is not configured. Set "fx-resource-local-debug.localBotEndpoint" in ".fx/default.user.data" and try again.'
    ),
    SolutionSource,
    "LocalBotEndpointNotConfigured"
  );
}

export function InvalidLocalBotEndpointFormat(localBotEndpoint: string): UserError {
  return returnUserError(
    new Error(`Local bot endpoint format is invalid: ${localBotEndpoint}.`),
    SolutionSource,
    "InvalidLocalBotEndpointFormat"
  );
}

export function ScaffoldLocalDebugSettingsV1Error(): SystemError {
  return returnSystemError(
    new Error("Failed to convert api v1 context to v2 context."),
    SolutionSource,
    "ScaffoldLocalDebugSettingsV1Error"
  );
}

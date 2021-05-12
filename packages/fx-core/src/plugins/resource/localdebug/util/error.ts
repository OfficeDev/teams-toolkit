// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { returnSystemError, returnUserError, SystemError, UserError } from "@microsoft/teamsfx-api";

export function UnsupportedPlatform(platform: string): SystemError {
    return returnSystemError(new Error(`Unsupported platform: ${platform}.`), "localdebug-plugin", "UnsupportedPlatform");
}

export function MissingComponent(component: string): UserError { 
    return returnUserError(new Error(`Component ${component} is required for local debug.`), "localdebug-plugin", "MissingComponent");
}

export function MissingStep(operation: string, requiredStep: string): UserError { 
    return returnUserError(new Error(`Step "${requiredStep}" is required before ${operation}. Run the required step first.`), "localdebug-plugin", "MissingStep");
}

export function NgrokTunnelNotConnected(): UserError {
    return returnUserError(new Error("Ngrok tunnel is not connected. Check your network settings and try again."), "localdebug-plugin", "NgrokTunnelNotConnected");
}

export function LocalBotEndpointNotConfigured(): UserError {
    return returnUserError(new Error("Local bot endpoint is not configured. Set \"fx-resource-local-debug.localBotEndpoint\" in \".fx/default.user.data\" and try again."), "localdebug-plugin", "LocalBotEndpointNotConfigured");
}

export function InvalidLocalBotEndpointFormat(localBotEndpoint: string): UserError {
    return returnUserError(new Error(`Local bot endpoint format is invalid: ${localBotEndpoint}.`), "localdebug-plugin", "InvalidLocalBotEndpointFormat");
}
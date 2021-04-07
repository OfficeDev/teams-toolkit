// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { returnSystemError, returnUserError, SystemError, UserError } from "fx-api";

export function UnsupportedPlatform(platform: string): SystemError {
    return returnSystemError(new Error(`Platform ${platform} is unsupported.`), "localdebug-plugin", "UnsupportedPlatform");
}

export function MissingComponent(component: string): UserError { 
    return returnUserError(new Error(`Component ${component} is required for local debug.`), "localdebug-plugin", "MissingComponent");
}

export function MissingStep(operation: string, requiredStep: string): UserError { 
    return returnUserError(new Error(`Step "${requiredStep}" is required before ${operation}. Please run the required step first.`), "localdebug-plugin", "MissingStep");
}

export function NgrokTunnelNotConnected(): UserError {
    return returnUserError(new Error("Ngrok tunnel is not successfully connected. Please check your network and try again."), "localdebug-plugin", "NgrokTunnelNotConnected");
}
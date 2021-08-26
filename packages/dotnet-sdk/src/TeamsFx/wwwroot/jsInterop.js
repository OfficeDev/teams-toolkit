// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TeamsUserCredential, setLogFunction } from "./teamsfx.js"

// create class instance
export function createTeamsUserCredential() {
    return new TeamsUserCredential();
}

// call .NET function
export function setLogFunctionCallback(logFunctionCallbackRef) {
    setLogFunction((level, message) => {
        logFunctionCallbackRef.invokeMethodAsync('Invoke', level, message);
    });
}

export function clearLogFunctionCallback() {
    setLogFunction(undefined);
}

export * from "./teamsfx.js"

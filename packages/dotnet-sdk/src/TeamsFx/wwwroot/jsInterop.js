// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function initialize() {
    return microsoftTeams.app.initialize();
}

export function authenticate(url) {
    return microsoftTeams.authentication.authenticate({
        url: url,
        width: 600,
        height: 535,
    });
}

export function getAuthToken(...resources) {
    return microsoftTeams.authentication.getAuthToken(...resources);
}

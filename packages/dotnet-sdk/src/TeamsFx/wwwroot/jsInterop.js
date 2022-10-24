// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function initialize() {
    microsoftTeams.app.initialize();
}

export function authenticate(url) {
    microsoftTeams.authentication.authenticate({
        url: url,
        width: 600,
        height: 535,
    });
}

export function getAuthToken(...resources) {
    microsoftTeams.authentication.getAuthToken(...resources);
}

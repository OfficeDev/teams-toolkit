// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.


export function initialize() {
    const initializeTeamsSdkTimeoutInMillisecond = 5000;
    let initialized = false;
    return new Promise((resolve, reject) => {
        try {
            microsoftTeams.initialize(() => {
                initialized = true;
                resolve();
            });
        } catch (e) {
            reject(e);
        }
        // If the code not running in Teams, the initialize callback function would never trigger
        setTimeout(() => {
            if (!initialized) {
                reject("timeout");
            }
        }, initializeTeamsSdkTimeoutInMillisecond);
    });
}

export function authenticate(url) {
    return new Promise((resolve, reject) => {
        microsoftTeams.authentication.authenticate({
            url: url,
            width: 600,
            height: 535,
            successCallback: function (token) {
                resolve(token);
            },
            failureCallback: function (reason) {
                reject(reason);
            },
        });
    });
}

export function getAuthToken() {
    return new Promise((resolve, reject) => {
        try {
            microsoftTeams.authentication.getAuthToken({
                successCallback: function (token) {
                    resolve(token);
                },
                failureCallback: function (reason) {
                    reject(reason);
                },
                resources: [],
            });
        } catch (e) {
            reject(e);
        }
    });
}

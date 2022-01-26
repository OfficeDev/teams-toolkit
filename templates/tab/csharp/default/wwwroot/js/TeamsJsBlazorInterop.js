export function initializeAsync() {
    return new Promise((resolve, reject) => {
        try {
            microsoftTeams.initialize(() => {
                resolve();
            });
        } catch (e) {
            reject(e);
        }        
    });
}

export function getContextAsync() {
    return new Promise((resolve, reject) => {
        try {
            microsoftTeams.getContext((context) => {
                resolve(context);
            });
        } catch (e) {
            reject(e);
        }        
    });    
}

export function initializeWithContext(contentUrl, websiteUrl) {
    microsoftTeams.initializeWithContext(contentUrl, websiteUrl);
}

export function setFrameContext(contentUrl, websiteUrl) {
    microsoftTeams.setFrameContext(contentUrl, websiteUrl);
}

export function registerFullScreenHandler() {
    return new Promise((resolve, reject) => {
        try {
            microsoftTeams.registerFullScreenHandler((isFullScreen) => {
                resolve(isFullScreen);
            });
        } catch (e) {
            reject(e);
        }
    });
}

export function registerChangeSettingsHandler() {
    microsoftTeams.registerChangeSettingsHandler();
}

export function getTabInstances(tabInstanceParameters) {
    return new Promise((resolve, reject) => {
        try {
            microsoftTeams.getTabInstances((tabInfo) => {
                resolve(tabInfo);
            }, tabInstanceParameters);
        } catch (e) {
            reject(e);
        }
    });
}

export function getMruTabInstances(tabInstanceParameters) {
    return new Promise((resolve, reject) => {
        try {
            microsoftTeams.getMruTabInstances((tabInfo) => {
                resolve(tabInfo);
            }, tabInstanceParameters);
        } catch (e) {
            reject(e);
        }
    });
}

export function shareDeepLink(deepLinkParameters) {
    microsoftTeams.shareDeepLink(deepLinkParameters);
}

export function executeDeepLink(deepLink) {
    return new Promise((resolve, reject) => {
        try {
            microsoftTeams.executeDeepLink(deepLink, (status, reason) => {
                resolve(status, reason);
            });
        } catch (e) {
            reject(e);
        }
    });
}

export function navigateToTab(tabInstance) {
    return new Promise((resolve, reject) => {
        try {
            microsoftTeams.navigateToTab(tabInstance, (status, reason) => {
                resolve(status, reason);
            });
        } catch (e) {
            reject(e);
        }
    });
}

// Settings module
export function registerOnSaveHandler(settings) {
    microsoftTeams.settings.registerOnSaveHandler((saveEvent) => {
        microsoftTeams.settings.setSettings(settings);
        saveEvent.notifySuccess();
    });

    microsoftTeams.settings.setValidityState(true);
}


// Temporary solution: https://github.com/OfficeDev/microsoft-teams-library-js/issues/310
// https://github.com/OfficeDev/msteams-ui-components/blob/master/gh-pages/src/index.tsx#L68-L74
export function inTeams() {
    var microsoftTeamsLib = microsoftTeams || window["microsoftTeams"];
    return window.self !== window.top && microsoftTeamsLib !== undefined;
}
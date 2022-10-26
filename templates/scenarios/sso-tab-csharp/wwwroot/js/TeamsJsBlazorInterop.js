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

// Come from here: https://github.com/wictorwilen/msteams-react-base-component/blob/master/src/useTeams.ts
export function inTeams() {
    if (
        (window.parent === window.self && window.nativeInterface) ||
        window.navigator.userAgent.includes("Teams/") ||
        window.name === "embedded-page-container" ||
        window.name === "extension-tab-frame"
    ) {
        return true;
    }
    return false;
}
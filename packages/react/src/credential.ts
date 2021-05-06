// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
    loadConfiguration,
    ResourceType,
    TeamsUserCredential,
} from "@microsoft/teamsfx";

/**
 * Load configuration using React environment variables and return a new TeamsUserCredential instance.
 * 
 * @param scopes - The array of Microsoft Token scope of access. Default value is  `[.default]`. Scopes provide a way to manage permissions to protected resources.
 * @returns a TeamsUserCredential instance.
 * 
 * @internal
 */
export function getCredential(scopes: string[] = [".default"]): TeamsUserCredential {
    const teamsfxEndpoint = process.env.REACT_APP_TEAMSFX_ENDPOINT;
    const startLoginPageUrl = process.env.REACT_APP_START_LOGIN_PAGE_URL;
    const functionEndpoint = process.env.REACT_APP_FUNC_ENDPOINT;
    const clientId = process.env.REACT_APP_CLIENT_ID;
    loadConfiguration({
        authentication: {
            initiateLoginEndpoint: startLoginPageUrl,
            simpleAuthEndpoint: teamsfxEndpoint,
            clientId: clientId,
        },
        resources: [
            {
                type: ResourceType.API,
                name: "default",
                properties: {
                    endpoint: functionEndpoint,
                }
            }
        ]
    });
    const credential = new TeamsUserCredential();
    return credential;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as chai from "chai";
import axios from "axios";

import AppStudioTokenProvider from "./mockAppStudioTokenProvider";
import { IAADDefinition, IAadObject, IAadObjectLocal } from "./interfaces/IAADDefinition";

const aadPluginName = "fx-resource-aad-app-for-teams";
const baseUrl = "https://dev.teams.microsoft.com/api/aadapp/v2";

function delay(ms: number) {
    // tslint:disable-next-line no-string-based-set-timeout
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AadValidator {
    public static init(ctx: any, isLocalDebug = false): IAadObject {
        console.log("Start to init validator for Azure AD app.");

        const aadObject: IAadObject | undefined = AadValidator.parseConfig(ctx[aadPluginName], isLocalDebug);
        chai.assert.exists(aadObject);

        console.log("Successfully init validator for Azure AD app.");
        return aadObject!;
    }

    public static async validate(aadObject: IAadObject, expectedPermission?: string) {
        console.log("Start to validate Azure AD app.");

        const groundTruth = await AadValidator.getAadApp(aadObject.objectId);
        chai.assert.exists(groundTruth);

        chai.assert(aadObject.clientId, groundTruth?.appId);
        chai.assert(aadObject.oauth2PermissionScopeId, groundTruth?.api?.oauth2PermissionScopes![0].id);
        chai.assert(aadObject.applicationIdUris, groundTruth?.identifierUris![0]);

        if (expectedPermission) {
            console.log("Start to validate permission for Azure AD app.");
            chai.assert(expectedPermission, JSON.stringify(groundTruth?.requiredResourceAccess));
        }

        console.log("Successfully validate Azure AD app.");
    }

    private static parseConfig(aad: any, isLocalDebug: boolean): IAadObject | undefined {
        if (!isLocalDebug) {
            return <IAadObject>aad;
        } else {
            const localObject = <IAadObjectLocal>aad;
            return AadValidator.objectTransform(localObject);
        }
    }

    private static async getAadApp(objectId: string) {
        const token = await AppStudioTokenProvider.getAccessToken();
    
        let retries = 10;
        while (retries > 0) {
            try {
                retries = retries - 1;
                axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
                const aadGetResponse = await axios.get(`${baseUrl}/${objectId}`);
                if (aadGetResponse && aadGetResponse.data && aadGetResponse.data["identifierUris"][0]) {
                    return <IAADDefinition>aadGetResponse.data;
                }
            } catch (error) {
                console.log("Azure AD app get failed. Retry.");
            }

            await delay(10000);
        }

        return undefined;
    }

    private static objectTransform(localObject: IAadObjectLocal): IAadObject {
        return {
            clientId: localObject.local_clientId,
            clientSecret: localObject.local_clientSecret,
            objectId: localObject.local_objectId,
            oauth2PermissionScopeId: localObject.local_oauth2PermissionScopeId,
            applicationIdUris: localObject.local_applicationIdUris,
            oauthAuthority: localObject.oauthAuthority,
            teamsMobileDesktopAppId: localObject.teamsMobileDesktopAppId,
            teamsWebAppId: localObject.teamsWebAppId
        } as IAadObject;
    }
}

export async function deleteAadApp(ctx: any) {
    const token = await AppStudioTokenProvider.getAccessToken();
    const objectId: string = (<IAadObject>ctx[aadPluginName]).objectId;
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    return axios.delete(`${baseUrl}/${objectId}`);
}

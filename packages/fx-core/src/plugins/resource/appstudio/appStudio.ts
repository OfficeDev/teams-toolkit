// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios, { AxiosInstance } from "axios";
import { IAppDefinition } from "../../solution/fx-solution/appstudio/interface";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AppStudioClient {
    const baseUrl = "https://dev.teams.microsoft.com";

    // Creates a new axios instance to call app studio to prevent setting the accessToken on global instance.
    function createRequesterWithToken(appStudioToken: string): AxiosInstance {
        const instance = axios.create({
            baseURL: baseUrl,
        });
        instance.defaults.headers.common["Authorization"] = `Bearer ${appStudioToken}`;
        return instance;
    }

    export async function validateManifest(manifestString: string, appStudioToken: string): Promise<string[]> {
        try {
            const requester = createRequesterWithToken(appStudioToken);
            const buffer = Buffer.from(manifestString, "utf8");
            const response = await requester.post("/api/appdefinitions/prevalidation", buffer, {headers: {"Content-Type": "application/json"}});
            if (response && response.data) {
                let validationResult: string[] = [];
                validationResult = validationResult.concat(response.data.errors);
                validationResult = validationResult.concat(response.data.warnings);
                validationResult = validationResult.concat(response.data.info);
                return validationResult;
            } else {
                throw AppStudioResultFactory.SystemError(
                    AppStudioError.ValidationFailedError.name, 
                    AppStudioError.ValidationFailedError.message(["Unknown reason"])
                );
            }
        } catch (e) {
            throw AppStudioResultFactory.SystemError(
                AppStudioError.ValidationFailedError.name, 
                AppStudioError.ValidationFailedError.message(["Unknown reason"]),
                e
            );
        }
    }

    export async function updateTeamsApp(teamsAppId: string, appDefinition: IAppDefinition, appStudioToken: string): Promise<boolean> {
        try {
            const requester = createRequesterWithToken(appStudioToken);
            const response = await requester.post(`/api/appdefinitions/${teamsAppId}`, appDefinition);
            if (response && response.data) {
                const app = <IAppDefinition>response.data;

                if (app && app.teamsAppId && app.teamsAppId === teamsAppId) {
                    return true;
                } else {
                    throw AppStudioResultFactory.SystemError(
                        AppStudioError.TeamsAppUpdateIDNotMatchError.name, 
                        AppStudioError.TeamsAppUpdateIDNotMatchError.message(teamsAppId, app.teamsAppId)
                    );
                }
            }
        } catch (e) {
            throw AppStudioResultFactory.SystemError(
                AppStudioError.TeamsAppUpdateFailedError.name,
                AppStudioError.TeamsAppUpdateFailedError.message(teamsAppId), 
                e
            );
        }
        return false;
    }

    export async function publishTeamsApp(teamsAppId: string, file: Buffer, appStudioToken: string): Promise<string> {
        try {
            // Check if the app exists in Teams App Catalog
            const appCatalogAppId = await getAppByTeamsAppId(teamsAppId, appStudioToken);

            const requester = createRequesterWithToken(appStudioToken);
            let response = null;
            if (appCatalogAppId) {
                // update the existing app
                response = await requester.post(`/api/publishing/${teamsAppId}/appdefinitions`, file, {headers: {"Content-Type": "application/zip"}});
            } else {
                // publish a new app to Teams App Catalog               
                response = await requester.post("/api/publishing", file,  {headers: {"Content-Type": "application/zip"}});
            }
            
            if (response && response.data) {
                if (response.data.errorMessage) {
                    const error = JSON.parse(response.data.errorMessage);
                    if (error.code === "Conflict") {
                        throw AppStudioResultFactory.SystemError(
                            AppStudioError.TeamsAppPublishConflictError.name,
                            AppStudioError.TeamsAppPublishConflictError.message(teamsAppId),
                            response.data.errorMessage
                        );
                    } else {
                        throw AppStudioResultFactory.SystemError(
                            AppStudioError.TeamsAppPublishFailedError.name,
                            AppStudioError.TeamsAppPublishFailedError.message(teamsAppId)
                        );
                    }
                } else {
                    return response.data.id;
                }
            } else {
                throw AppStudioResultFactory.SystemError(
                    AppStudioError.TeamsAppPublishFailedError.name,
                    AppStudioError.TeamsAppPublishFailedError.message(teamsAppId)
                );
            }
        } catch (error) {
            throw AppStudioResultFactory.SystemError(
                AppStudioError.TeamsAppPublishFailedError.name,
                AppStudioError.TeamsAppPublishFailedError.message(teamsAppId),
                error
            );
        }
    }

    async function getAppByTeamsAppId(teamsAppId: string, appStudioToken: string): Promise<string | undefined> {
        const requester = createRequesterWithToken(appStudioToken);
        const response = await requester.get(`/api/publishing/${teamsAppId}`);
        if (response && response.data && response.data.value && response.data.value.length > 0) {
            return response.data.value[0].id;
        } else {
            return undefined;
        }
    }
}
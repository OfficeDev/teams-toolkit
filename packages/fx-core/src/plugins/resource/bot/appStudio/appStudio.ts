import { IAADApplication, IAADPassword } from "./interfaces/IAADApplication";
import { IBotRegistration } from "./interfaces/IBotRegistration";

import { AxiosInstance, default as axios } from "axios";
import { CallAppStudioError, ConfigUpdatingError, ProvisionError, SomethingMissingError } from "../errors";
import { CommonStrings, ConfigNames } from "../resources/strings";
import { LifecycleFuncNames } from "../constants";
import { RetryHanlder } from "../utils/retryHandler";

const baseUrl = "https://dev.teams.microsoft.com";

function newAxiosInstance(accessToken: string): AxiosInstance {
    if (!accessToken) {
        throw new SomethingMissingError(ConfigNames.APPSTUDIO_TOKEN);
    }

    return axios.create({
        headers: {
            post: {
                "Authorization": `Bearer ${accessToken}`
            },
            get: {
                "Authorization": `Bearer ${accessToken}`
            }
        }
    });
}

export async function createAADApp(accessToken: string, aadApp: IAADApplication): Promise<IAADApplication> {
    const axiosInstance = newAxiosInstance(accessToken);

    let response = undefined;
    try {
        response = await RetryHanlder(() => axiosInstance.post(`${baseUrl}/api/aadapp`, aadApp));
    } catch (e) {
        throw new ProvisionError(CommonStrings.AAD_APP, e);
    }

    if (!response || !response.data) {
        throw new ProvisionError(CommonStrings.AAD_APP);
    }

    const app = response.data as IAADApplication;
    if (!app || !app.id || !app.objectId) {
        throw new ProvisionError(CommonStrings.AAD_APP);
    }

    return app;
}

export async function checkAADApp(accessToken: string, objectId: string): Promise<boolean> {
    const axiosInstance = newAxiosInstance(accessToken);

    let response = undefined;
    try {
        response = await RetryHanlder(() => axiosInstance.get(`${baseUrl}/api/aadapp/v2/${objectId}`));
    } catch (e) {
        throw new CallAppStudioError(LifecycleFuncNames.CHECK_AAD_APP, e);
    }

    if (!response || !response.data) {
        return false;
    }

    const app = response.data as IAADApplication;
    if (!app || !app.id || !app.objectId) {
        return false;
    }

    return true;
}

export async function createAADAppPassword(accessToken: string, aadAppObjectId?: string): Promise<IAADPassword> {
    const axiosInstance = newAxiosInstance(accessToken);

    let response = undefined;
    try {
        response = await RetryHanlder(() => axiosInstance.post(`${baseUrl}/api/aadapp/${aadAppObjectId}/passwords`));
    } catch (e) {
        throw new ProvisionError(CommonStrings.AAD_CLIENT_SECRET, e);
    }

    if (!response || !response.data) {
        throw new ProvisionError(CommonStrings.AAD_CLIENT_SECRET);
    }

    const app = response.data as IAADPassword;
    if (!app) {
        throw new ProvisionError(CommonStrings.AAD_CLIENT_SECRET);
    }

    return app;
}

export async function createBotRegistration(accessToken: string, registration: IBotRegistration): Promise<void> {
    const axiosInstance = newAxiosInstance(accessToken);

    let response = undefined;
    try {
        response = await RetryHanlder(() => axiosInstance.post(`${baseUrl}/api/botframework`, registration));
    } catch (e) {
        throw new ProvisionError(CommonStrings.APPSTUDIO_BOT_REGISTRATION, e);
    }

    if (!response || !response.data) {
        throw new ProvisionError(CommonStrings.APPSTUDIO_BOT_REGISTRATION);
    }

    return;
}

export async function updateMessageEndpoint(accessToken: string, botId: string, registration: IBotRegistration): Promise<void> {
    const axiosInstance = newAxiosInstance(accessToken);

    let response = undefined;
    try {
        response = await RetryHanlder(() => axiosInstance.post(`${baseUrl}/api/botframework/${botId}`, registration));
    } catch (e) {
        throw new ConfigUpdatingError(ConfigNames.MESSAGE_ENDPOINT, e);
    }

    if (!response || !response.data) {
        throw new ConfigUpdatingError(ConfigNames.MESSAGE_ENDPOINT);
    }

    return;
}
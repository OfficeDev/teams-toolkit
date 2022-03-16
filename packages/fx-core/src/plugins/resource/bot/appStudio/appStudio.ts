import { IAADApplication, IAADPassword } from "./interfaces/IAADApplication";
import { IBotRegistration } from "./interfaces/IBotRegistration";
import { IAADDefinition } from "./interfaces/IAADDefinition";

import { AxiosInstance, default as axios } from "axios";
import {
  AADAppCheckingError,
  ConfigUpdatingError,
  MessageEndpointUpdatingError,
  ProvisionError,
  SomethingMissingError,
} from "../errors";
import { CommonStrings, ConfigNames } from "../resources/strings";
import { RetryHandler } from "../utils/retryHandler";
import { getAppStudioEndpoint } from "../../../..";
import { Messages } from "../resources/messages";
import { Logger } from "../logger";

export class AppStudio {
  private static baseUrl = getAppStudioEndpoint();

  private static newAxiosInstance(accessToken: string): AxiosInstance {
    if (!accessToken) {
      throw new SomethingMissingError(ConfigNames.APPSTUDIO_TOKEN);
    }

    const instance = axios.create({
      headers: {
        post: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Source": "teamstoolkit",
        },
        get: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Source": "teamstoolkit",
        },
      },
    });
    instance.interceptors.request.use(function (config) {
      config.params = { teamstoolkit: true, ...config.params };
      return config;
    });
    return instance;
  }

  public static async createAADAppV2(
    accessToken: string,
    aadApp: IAADDefinition
  ): Promise<IAADDefinition> {
    const axiosInstance = AppStudio.newAxiosInstance(accessToken);

    let response = undefined;
    try {
      response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudio.baseUrl}/api/aadapp/v2`, aadApp)
      );
    } catch (e) {
      throw new ProvisionError(CommonStrings.AAD_APP, e);
    }

    if (!response || !response.data) {
      throw new ProvisionError(CommonStrings.AAD_APP);
    }

    const app = response.data as IAADDefinition;
    if (!app || !app.id || !app.appId) {
      throw new ProvisionError(CommonStrings.AAD_APP);
    }

    return app;
  }

  public static async createAADApp(
    accessToken: string,
    aadApp: IAADApplication
  ): Promise<IAADApplication> {
    const axiosInstance = AppStudio.newAxiosInstance(accessToken);

    let response = undefined;
    try {
      response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudio.baseUrl}/api/aadapp`, aadApp)
      );
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

  public static async isAADAppExisting(accessToken: string, objectId: string): Promise<boolean> {
    const axiosInstance = AppStudio.newAxiosInstance(accessToken);

    let response = undefined;
    try {
      response = await RetryHandler.Retry(() =>
        axiosInstance.get(`${AppStudio.baseUrl}/api/aadapp/v2/${objectId}`)
      );
    } catch (e) {
      throw new AADAppCheckingError(e);
    }

    if (!response || !response.data) {
      return false;
    }

    const app = response.data as IAADDefinition;
    return !(!app || !app.id || !app.appId);
  }

  public static async createAADAppPassword(
    accessToken: string,
    aadAppObjectId?: string
  ): Promise<IAADPassword> {
    const axiosInstance = AppStudio.newAxiosInstance(accessToken);

    let response = undefined;
    try {
      response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudio.baseUrl}/api/aadapp/${aadAppObjectId}/passwords`)
      );
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

  public static async createBotRegistration(
    accessToken: string,
    registration: IBotRegistration
  ): Promise<void> {
    const axiosInstance = AppStudio.newAxiosInstance(accessToken);

    let response = undefined;
    try {
      if (registration.botId) {
        const getBotRegistrationResponse = await RetryHandler.Retry(
          () => axiosInstance.get(`${AppStudio.baseUrl}/api/botframework/${registration.botId}`),
          true
        );
        if (getBotRegistrationResponse && getBotRegistrationResponse.data) {
          Logger.info(Messages.BotResourceExist("Appstudio"));
          return;
        }
      }

      response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudio.baseUrl}/api/botframework`, registration)
      );
    } catch (e) {
      throw new ProvisionError(CommonStrings.APP_STUDIO_BOT_REGISTRATION, e);
    }

    if (!response || !response.data) {
      throw new ProvisionError(CommonStrings.APP_STUDIO_BOT_REGISTRATION);
    }

    return;
  }

  public static async updateMessageEndpoint(
    accessToken: string,
    botId: string,
    registration: IBotRegistration
  ): Promise<void> {
    const axiosInstance = AppStudio.newAxiosInstance(accessToken);

    let response = undefined;
    try {
      response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudio.baseUrl}/api/botframework/${botId}`, registration)
      );
    } catch (e) {
      throw new MessageEndpointUpdatingError(registration.messagingEndpoint, e);
    }

    if (!response || !response.data) {
      throw new ConfigUpdatingError(ConfigNames.MESSAGE_ENDPOINT);
    }

    return;
  }
}

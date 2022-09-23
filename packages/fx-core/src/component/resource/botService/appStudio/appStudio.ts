// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IAADApplication, IAADPassword } from "./interfaces/IAADApplication";
import { IBotRegistration } from "./interfaces/IBotRegistration";
import { IAADDefinition } from "./interfaces/IAADDefinition";

import { AxiosInstance, AxiosResponse, default as axios } from "axios";
import {
  AADAppCheckingError,
  BotRegistrationNotFoundError,
  ConfigUpdatingError,
  MessageEndpointUpdatingError,
  ProvisionError,
  SomethingMissingError,
} from "../errors";
import { CommonStrings, ConfigNames } from "../strings";
import { RetryHandler } from "../retryHandler";
import { Messages } from "../messages";
import { getAppStudioEndpoint } from "../../../../component/resource/appManifest/constants";
import { LogProvider } from "@microsoft/teamsfx-api";

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

  public static async getBotRegistration(
    accessToken: string,
    botId: string
  ): Promise<IBotRegistration | undefined> {
    const axiosInstance = AppStudio.newAxiosInstance(accessToken);

    const getBotRegistrationResponse: AxiosResponse<any> | undefined = await RetryHandler.Retry(
      async () => {
        try {
          return await axiosInstance.get(`${AppStudio.baseUrl}/api/botframework/${botId}`);
        } catch (e) {
          if (e.response?.status === 404) {
            return e.response;
          } else {
            e.teamsfxUrlName = "<get-bot-registration>";
            throw e;
          }
        }
      },
      true
    );
    if (getBotRegistrationResponse?.status === 200) {
      return <IBotRegistration>getBotRegistrationResponse.data;
    } else {
      return undefined;
    }
  }

  public static async createBotRegistration(
    accessToken: string,
    registration: IBotRegistration,
    logger?: LogProvider
  ): Promise<void> {
    const axiosInstance = AppStudio.newAxiosInstance(accessToken);

    let response = undefined;
    try {
      if (registration.botId) {
        const botReg = await AppStudio.getBotRegistration(accessToken, registration.botId);
        if (botReg) {
          logger?.info(Messages.BotResourceExist("Appstudio"));
          return;
        }
      }

      response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudio.baseUrl}/api/botframework`, registration)
      );
    } catch (e) {
      e.teamsfxUrlName = "<create-bot-registration>";
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
    endpoint: string
  ): Promise<void> {
    const axiosInstance = AppStudio.newAxiosInstance(accessToken);

    const botReg = await AppStudio.getBotRegistration(accessToken, botId);
    if (!botReg) {
      throw new BotRegistrationNotFoundError(botId);
    }
    botReg.messagingEndpoint = endpoint;

    let response = undefined;
    try {
      response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudio.baseUrl}/api/botframework/${botId}`, botReg)
      );
    } catch (e) {
      e.teamsfxUrlName = "<update-message-endpoint>";
      throw new MessageEndpointUpdatingError(botReg.messagingEndpoint, e);
    }

    if (!response || !response.data) {
      throw new ConfigUpdatingError(ConfigNames.MESSAGE_ENDPOINT);
    }

    return;
  }
}

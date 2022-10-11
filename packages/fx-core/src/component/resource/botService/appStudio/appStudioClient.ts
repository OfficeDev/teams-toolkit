// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBotRegistration } from "./interfaces/IBotRegistration";

import { AxiosInstance, AxiosResponse, default as axios } from "axios";
import { ConfigUpdatingError, MessageEndpointUpdatingError, ProvisionError } from "../errors";
import { CommonStrings, ConfigNames } from "../strings";
import { RetryHandler } from "../retryHandler";
import { Messages } from "../messages";
import { getAppStudioEndpoint } from "../../appManifest/constants";
import { ResourceContextV3 } from "@microsoft/teamsfx-api";
import { CheckThrowSomethingMissing } from "../../../error";
import { FxBotPluginResultFactory } from "../result";

export class AppStudioClient {
  private static baseUrl = getAppStudioEndpoint();

  private static newAxiosInstance(accessToken: string): AxiosInstance {
    accessToken = CheckThrowSomethingMissing(
      FxBotPluginResultFactory.source,
      ConfigNames.APPSTUDIO_TOKEN,
      accessToken
    );
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

  public static async getBotRegistration(
    botId: string,
    token: string
  ): Promise<IBotRegistration | undefined> {
    const axiosInstance = AppStudioClient.newAxiosInstance(token);

    const getBotRegistrationResponse: AxiosResponse<any> | undefined = await RetryHandler.Retry(
      async () => {
        try {
          return await axiosInstance.get(`${AppStudioClient.baseUrl}/api/botframework/${botId}`);
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
    registration: IBotRegistration,
    token: string,
    context: ResourceContextV3
  ): Promise<void> {
    const axiosInstance = AppStudioClient.newAxiosInstance(token);

    let response = undefined;
    try {
      if (registration.botId) {
        const botReg = await AppStudioClient.getBotRegistration(token, registration.botId);
        if (botReg) {
          context.logProvider?.info(Messages.BotResourceExist("Appstudio"));
          return;
        }
      }

      response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudioClient.baseUrl}/api/botframework`, registration)
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

  public static async updateBotRegistration(
    token: string,
    botReg: IBotRegistration
  ): Promise<void> {
    const axiosInstance = AppStudioClient.newAxiosInstance(token);

    let response = undefined;
    try {
      response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudioClient.baseUrl}/api/botframework/${botReg.botId}`, botReg)
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

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBotRegistration } from "./interfaces/IBotRegistration";

import { AxiosInstance, default as axios } from "axios";
import {
  BotRegistrationNotFoundError,
  ConfigUpdatingError,
  ProvisionError,
  FailedToCreateBotRegistrationError,
  BotFrameworkNotAllowedToAcquireTokenError,
  BotFrameworkForbiddenResultError,
  BotFrameworkConflictResultError,
} from "../errors";
import { CommonStrings, ConfigNames } from "../strings";
import { RetryHandler } from "../retryHandler";
import { Messages } from "../messages";
import { APP_STUDIO_API_NAMES, getAppStudioEndpoint } from "../../appManifest/constants";
import { ResourceContextV3, SystemError } from "@microsoft/teamsfx-api";
import { CheckThrowSomethingMissing } from "../../../error";
import { FxBotPluginResultFactory } from "../result";
import { AppStudioClient as AppStudio } from "../../appManifest/appStudioClient";

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

  /**
   * Set user region
   * @param _region e.g. https://dev.teams.microsoft.com/amer
   */
  public static setRegion(region: string) {
    AppStudioClient.baseUrl = region;
  }

  public static async getBotRegistration(
    token: string,
    botId: string
  ): Promise<IBotRegistration | undefined> {
    const axiosInstance = AppStudioClient.newAxiosInstance(token);

    return await RetryHandler.Retry(async () => {
      try {
        const response = await axiosInstance.get(
          `${AppStudioClient.baseUrl}/api/botframework/${botId}`
        );
        return <IBotRegistration>response.data;
      } catch (e) {
        if (e.response?.status === 404) {
          return undefined; // Stands for NotFound.
        } else if (e.response?.status === 401) {
          throw new BotFrameworkNotAllowedToAcquireTokenError();
        } else {
          // Potential live site issue cases.
          e.teamsfxUrlName = "<get-bot-registration>";
          throw AppStudio.wrapException(e, APP_STUDIO_API_NAMES.GET_BOT) as SystemError;
        }
      }
    }, true);
  }

  public static async createBotRegistration(
    token: string,
    registration: IBotRegistration,
    context?: ResourceContextV3
  ): Promise<void> {
    const axiosInstance = AppStudioClient.newAxiosInstance(token);

    if (registration.botId) {
      const botReg = await AppStudioClient.getBotRegistration(token, registration.botId);
      if (botReg) {
        context?.logProvider?.info(Messages.BotResourceExist("Appstudio"));
        return;
      } else {
        // Potential case when developers switched their M365 accounts.
        throw new FailedToCreateBotRegistrationError();
      }
    }

    try {
      const response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudioClient.baseUrl}/api/botframework`, registration)
      );
      if (!response || !response.data || response.status !== 200) {
        throw new ProvisionError(CommonStrings.APP_STUDIO_BOT_REGISTRATION);
      }
    } catch (e) {
      if (e.response?.status === 401) {
        throw new BotFrameworkNotAllowedToAcquireTokenError();
      } else if (e.response?.status === 403) {
        throw new BotFrameworkForbiddenResultError();
      } else if (e.response?.status === 429) {
        throw new BotFrameworkConflictResultError();
      } else {
        e.teamsfxUrlName = "<create-bot-registration>";
        throw AppStudio.wrapException(e, APP_STUDIO_API_NAMES.CREATE_BOT) as SystemError;
      }
    }

    return;
  }

  public static async updateMessageEndpoint(
    token: string,
    botId: string,
    endpoint: string
  ): Promise<void> {
    const botReg = await AppStudioClient.getBotRegistration(token, botId);
    if (!botReg) {
      throw new BotRegistrationNotFoundError(botId);
    }

    botReg.messagingEndpoint = endpoint;

    await AppStudioClient.updateBotRegistration(token, botReg);

    return;
  }

  public static async updateBotRegistration(
    token: string,
    botReg: IBotRegistration
  ): Promise<void> {
    const axiosInstance = AppStudioClient.newAxiosInstance(token);

    try {
      const response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudioClient.baseUrl}/api/botframework/${botReg.botId}`, botReg)
      );
      if (!response || !response.data || response.status !== 200) {
        throw new ConfigUpdatingError(ConfigNames.MESSAGE_ENDPOINT);
      }
    } catch (e) {
      if (e.response?.status === 401) {
        throw new BotFrameworkNotAllowedToAcquireTokenError();
      } else if (e.response?.status === 403) {
        throw new BotFrameworkForbiddenResultError();
      } else if (e.response?.status === 429) {
        throw new BotFrameworkConflictResultError();
      } else {
        e.teamsfxUrlName = "<update-message-endpoint>";
        throw AppStudio.wrapException(e, APP_STUDIO_API_NAMES.UPDATE_BOT) as SystemError;
      }
    }

    return;
  }
}

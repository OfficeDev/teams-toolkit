// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Jobs <ruhe@microsoft.com>
 */
import { IBotRegistration } from "./interfaces/IBotRegistration";

import { AxiosInstance, default as axios } from "axios";
import {
  BotRegistrationNotFoundError,
  ConfigUpdatingError,
  ProvisionError,
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
import { isHappyResponse } from "../common";
import { HttpStatusCode } from "../../../constant/commonConstant";
import { TeamsFxUrlNames } from "../../../constants";

export function handleBotFrameworkError(e: any, apiName: string): void | undefined {
  if (e.response?.status === HttpStatusCode.NOTFOUND) {
    return undefined; // Stands for NotFound.
  } else if (e.response?.status === HttpStatusCode.UNAUTHORIZED) {
    throw new BotFrameworkNotAllowedToAcquireTokenError();
  } else if (e.response?.status === HttpStatusCode.FORBIDDEN) {
    throw new BotFrameworkForbiddenResultError();
  } else if (e.response?.status === HttpStatusCode.TOOMANYREQS) {
    throw new BotFrameworkConflictResultError();
  } else {
    e.teamsfxUrlName = TeamsFxUrlNames[apiName];
    throw AppStudio.wrapException(e, apiName) as SystemError;
  }
}

export class AppStudioClient {
  private static baseUrl = getAppStudioEndpoint();

  public static newAxiosInstance(accessToken: string): AxiosInstance {
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

    try {
      const response = await RetryHandler.Retry(() =>
        axiosInstance.get(`${AppStudioClient.baseUrl}/api/botframework/${botId}`)
      );
      if (isHappyResponse(response)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return <IBotRegistration>response!.data; // response cannot be undefined as it's checked in isHappyResponse.
      } else {
        // Defensive code and it should never reach here.
        throw new Error("Failed to get data");
      }
    } catch (e) {
      handleBotFrameworkError(e, APP_STUDIO_API_NAMES.GET_BOT);
    }
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
      }
    }

    try {
      const response = await RetryHandler.Retry(() =>
        axiosInstance.post(`${AppStudioClient.baseUrl}/api/botframework`, registration)
      );
      if (!isHappyResponse(response)) {
        throw new ProvisionError(CommonStrings.APP_STUDIO_BOT_REGISTRATION);
      }
    } catch (e) {
      handleBotFrameworkError(e, APP_STUDIO_API_NAMES.CREATE_BOT);
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
      if (!isHappyResponse(response)) {
        throw new ConfigUpdatingError(ConfigNames.MESSAGE_ENDPOINT);
      }
    } catch (e) {
      handleBotFrameworkError(e, APP_STUDIO_API_NAMES.UPDATE_BOT);
    }

    return;
  }
}

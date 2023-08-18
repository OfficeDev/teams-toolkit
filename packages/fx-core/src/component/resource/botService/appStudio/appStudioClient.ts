// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Qianhao Dong <qidon@microsoft.com>
 */
import { BotChannelType, IBotRegistration } from "./interfaces/IBotRegistration";

import { Context, SystemError } from "@microsoft/teamsfx-api";
import { AxiosInstance, default as axios } from "axios";
import { HttpStatusCode } from "../../../constant/commonConstant";
import { AppStudioClient as AppStudio } from "../../../driver/teamsApp/clients/appStudioClient";
import { APP_STUDIO_API_NAMES, getAppStudioEndpoint } from "../../../driver/teamsApp/constants";
import { isHappyResponse } from "../common";
import { TeamsFxUrlNames } from "../constants";
import {
  BotFrameworkConflictResultError,
  BotFrameworkForbiddenResultError,
  BotFrameworkNotAllowedToAcquireTokenError,
  BotRegistrationNotFoundError,
  CheckThrowSomethingMissing,
  ConfigUpdatingError,
  ProvisionError,
} from "../errors";
import { Messages } from "../messages";
import { RetryHandler } from "../retryHandler";
import { CommonStrings, ConfigNames } from "../strings";
import { ErrorContextMW } from "../../../../core/globalVars";
import { hooks } from "@feathersjs/hooks";

function handleBotFrameworkError(e: any, apiName: string): void | undefined {
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
    accessToken = CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, accessToken);
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
  @hooks([ErrorContextMW({ source: "Teams", component: "AppStudioClient" })])
  public static async getBotRegistration(
    token: string,
    botId: string
  ): Promise<IBotRegistration | undefined> {
    AppStudio.sendStartEvent(APP_STUDIO_API_NAMES.GET_BOT);
    const axiosInstance = AppStudioClient.newAxiosInstance(token);

    try {
      const response = await RetryHandler.Retry(() =>
        axiosInstance.get(`${AppStudioClient.baseUrl}/api/botframework/${botId}`)
      );
      if (isHappyResponse(response)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        AppStudio.sendSuccessEvent(APP_STUDIO_API_NAMES.GET_BOT);
        return <IBotRegistration>response!.data; // response cannot be undefined as it's checked in isHappyResponse.
      } else {
        // Defensive code and it should never reach here.
        throw new Error("Failed to get data");
      }
    } catch (e) {
      handleBotFrameworkError(e, APP_STUDIO_API_NAMES.GET_BOT);
    }
  }
  @hooks([ErrorContextMW({ source: "Teams", component: "AppStudioClient" })])
  public static async createBotRegistration(
    token: string,
    registration: IBotRegistration,
    checkExistence = true,
    context?: Context
  ): Promise<void> {
    AppStudio.sendStartEvent(APP_STUDIO_API_NAMES.CREATE_BOT);
    const axiosInstance = AppStudioClient.newAxiosInstance(token);

    if (registration.botId && checkExistence) {
      const botReg = await AppStudioClient.getBotRegistration(token, registration.botId);
      if (botReg) {
        context?.logProvider?.info(Messages.BotResourceExist("Appstudio"));
        AppStudio.sendSuccessEvent(APP_STUDIO_API_NAMES.CREATE_BOT);
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
      AppStudio.sendSuccessEvent(APP_STUDIO_API_NAMES.CREATE_BOT);
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
    if (botReg.configuredChannels === undefined || botReg.configuredChannels.length === 0) {
      botReg.configuredChannels = [BotChannelType.MicrosoftTeams];
    }

    await AppStudioClient.updateBotRegistration(token, botReg);

    return;
  }
  @hooks([ErrorContextMW({ source: "Teams", component: "AppStudioClient" })])
  public static async updateBotRegistration(
    token: string,
    botReg: IBotRegistration
  ): Promise<void> {
    AppStudio.sendStartEvent(APP_STUDIO_API_NAMES.UPDATE_BOT);
    const axiosInstance = AppStudioClient.newAxiosInstance(token);

    try {
      const response = await RetryHandler.Retry(() =>
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        axiosInstance.post(`${AppStudioClient.baseUrl}/api/botframework/${botReg.botId}`, botReg)
      );
      if (!isHappyResponse(response)) {
        throw new ConfigUpdatingError(ConfigNames.MESSAGE_ENDPOINT);
      }
      AppStudio.sendSuccessEvent(APP_STUDIO_API_NAMES.UPDATE_BOT);
    } catch (e) {
      handleBotFrameworkError(e, APP_STUDIO_API_NAMES.UPDATE_BOT);
    }

    return;
  }
}

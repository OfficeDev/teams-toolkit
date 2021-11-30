// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as utils from "./utils/common";
import { AxiosInstance, default as axios } from "axios";

import { AADRegistrationConstants } from "./constants";
import { IAADDefinition } from "./appStudio/interfaces/IAADDefinition";
import { AppStudio } from "./appStudio/appStudio";
import { CheckThrowSomethingMissing, ErrorType, PluginError, ProvisionError } from "./errors";
import { CommonStrings } from "./resources/strings";
import { BotAuthCredential } from "./botAuthCredential";
import { AadError, CreateAppError, CreateSecretError } from "../aad/errors";
import { Constants } from "../aad/constants";
import { GraphErrorCodes } from "../aad/errorCodes";

export class AADRegistration {
  public static async registerAADAppAndGetSecretByGraph(
    graphToken: string,
    displayName: string,
    objectId?: string,
    msAppId?: string
  ): Promise<BotAuthCredential> {
    const axiosInstance: AxiosInstance = axios.create({
      headers: {
        post: {
          Authorization: `Bearer ${graphToken}`,
        },
      },
    });

    const result = new BotAuthCredential();

    if (!objectId && !msAppId) {
      // 1. Register a new AAD App.
      let regResponse = undefined;
      try {
        regResponse = await axiosInstance.post(
          `${AADRegistrationConstants.GRAPH_REST_BASE_URL}/applications`,
          {
            displayName: displayName,
            signInAudience: AADRegistrationConstants.AZURE_AD_MULTIPLE_ORGS,
          }
        );
      } catch (e) {
        throw AADRegistration.handleError(e, CreateAppError);
      }

      if (!regResponse || !utils.isHttpCodeOkOrCreated(regResponse.status)) {
        throw new ProvisionError(CommonStrings.AAD_APP);
      }
      result.clientId = regResponse.data.appId;
      result.objectId = regResponse.data.id;
    } else {
      CheckThrowSomethingMissing("objectId", objectId);
      CheckThrowSomethingMissing("msAppId", msAppId);
      result.objectId = objectId;
      result.clientId = msAppId;
    }

    // 2. Generate client secret.
    let genResponse = undefined;
    try {
      genResponse = await axiosInstance.post(
        `${AADRegistrationConstants.GRAPH_REST_BASE_URL}/applications/${result.objectId}/addPassword`,
        {
          passwordCredential: {
            displayName: "default",
          },
        }
      );
    } catch (e) {
      throw AADRegistration.handleError(e, CreateSecretError);
    }

    if (!genResponse || !genResponse.data) {
      throw new ProvisionError(CommonStrings.AAD_CLIENT_SECRET);
    }

    result.clientSecret = genResponse.data.secretText;
    return result;
  }

  public static async registerAADAppAndGetSecretByAppStudio(
    appStudioToken: string,
    displayName: string,
    objectId?: string,
    msAppId?: string
  ): Promise<BotAuthCredential> {
    const result = new BotAuthCredential();

    const appConfig: IAADDefinition = {
      displayName: displayName,
    };

    if (!objectId && !msAppId) {
      const app = await AppStudio.createAADAppV2(appStudioToken, appConfig);
      result.clientId = app.appId;
      result.objectId = app.id;
    } else {
      CheckThrowSomethingMissing("objectId", objectId);
      CheckThrowSomethingMissing("msAppId", msAppId);
      result.objectId = objectId;
      result.clientId = msAppId;
    }

    // create password for this AAD
    const password = await AppStudio.createAADAppPassword(appStudioToken, result.objectId);

    if (!password || !password.value) {
      throw new ProvisionError(CommonStrings.AAD_CLIENT_SECRET);
    }

    result.clientSecret = password.value;

    return result;
  }

  private static handleError(error: any, errorDetail: AadError, ...args: string[]): PluginError {
    if (
      error?.response?.status >= Constants.statusCodeUserError &&
      error?.response?.status < Constants.statusCodeServerError
    ) {
      // User Error
      // If known error code, will update help link.
      const errorCode = error?.response?.data?.error?.code;
      const helpLink = GraphErrorCodes.get(errorCode);
      return new PluginError(
        ErrorType.User,
        errorDetail.name,
        errorDetail.message(...args),
        [],
        error,
        helpLink ?? errorDetail.helpLink
      );
    } else {
      // System Error
      return new PluginError(
        ErrorType.System,
        errorDetail.name,
        errorDetail.message(...args),
        [],
        error
      );
    }
  }
}

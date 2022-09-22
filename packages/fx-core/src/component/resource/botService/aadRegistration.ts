// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as utils from "./common";
import { AxiosInstance, default as axios } from "axios";

import { AADRegistrationConstants } from "./constants";
import { IAADDefinition } from "./appStudio/interfaces/IAADDefinition";
import { AppStudio } from "./appStudio/appStudio";
import {
  checkAndThrowIfMissing,
  CreateAADAppError,
  CreateAADSecretError,
  ProvisionError,
} from "./errors";
import { CommonStrings } from "./strings";
import { BotAuthCredential } from "./botAuthCredential";
import { RetryHandler } from "./retryHandler";

export class AADRegistration {
  public static async registerAADAppAndGetSecretByGraph(
    graphToken: string,
    displayName: string,
    objectId?: string,
    msAppId?: string
  ): Promise<BotAuthCredential> {
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: AADRegistrationConstants.GRAPH_REST_BASE_URL,
    });
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${graphToken}`;

    const result = new BotAuthCredential();

    if (!objectId && !msAppId) {
      // 1. Register a new AAD App.
      let regResponse = undefined;
      try {
        regResponse = await RetryHandler.Retry(() =>
          axiosInstance.post(`${AADRegistrationConstants.GRAPH_REST_BASE_URL}/applications`, {
            displayName: displayName,
            signInAudience: AADRegistrationConstants.AZURE_AD_MULTIPLE_ORGS,
          })
        );
      } catch (e) {
        throw new CreateAADAppError(e);
      }

      if (!regResponse || !utils.isHttpCodeOkOrCreated(regResponse.status)) {
        throw new ProvisionError(CommonStrings.AAD_APP);
      }
      result.clientId = regResponse.data.appId;
      result.objectId = regResponse.data.id;
    } else {
      result.objectId = checkAndThrowIfMissing("objectId", objectId);
      result.clientId = checkAndThrowIfMissing("msAppId", msAppId);
    }

    // 2. Generate client secret.
    let genResponse = undefined;
    try {
      genResponse = await RetryHandler.Retry(() =>
        axiosInstance.post(
          `${AADRegistrationConstants.GRAPH_REST_BASE_URL}/applications/${result.objectId}/addPassword`,
          {
            passwordCredential: {
              displayName: "default",
            },
          }
        )
      );
    } catch (e) {
      throw new CreateAADSecretError(e);
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
      result.objectId = checkAndThrowIfMissing("objectId", objectId);
      result.clientId = checkAndThrowIfMissing("msAppId", msAppId);
    }

    // create password for this AAD
    const password = await AppStudio.createAADAppPassword(appStudioToken, result.objectId);

    if (!password || !password.value) {
      throw new ProvisionError(CommonStrings.AAD_CLIENT_SECRET);
    }

    result.clientSecret = password.value;

    return result;
  }
}

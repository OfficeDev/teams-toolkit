// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan He <ruhe@microsoft.com>
 */
import * as utils from "../common";
import { AxiosInstance, AxiosResponse, default as axios } from "axios";

import { AADRegistrationConstants } from "../constants";
import { CreateAADAppError, CreateAADSecretError, ProvisionError } from "../errors";
import { CommonStrings } from "../strings";
import { RetryHandler } from "../retryHandler";
import { AadAppCredentials } from "../AadAppCredentials";

export class GraphClient {
  public static async registerAadApp(
    token: string,
    displayName: string
  ): Promise<AadAppCredentials> {
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: AADRegistrationConstants.GRAPH_REST_BASE_URL,
    });
    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const result: AadAppCredentials = {
      clientId: "",
      clientSecret: "",
    };

    // 1. Register a new AAD App.
    let regResponse: AxiosResponse<any> | undefined;
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

    // 2. Generate client secret.
    let genResponse = undefined;
    try {
      genResponse = await RetryHandler.Retry(() =>
        axiosInstance.post(
          `${AADRegistrationConstants.GRAPH_REST_BASE_URL}/applications/${regResponse?.data.id}/addPassword`,
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
}

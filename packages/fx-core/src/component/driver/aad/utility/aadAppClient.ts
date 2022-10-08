// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { M365TokenProvider } from "@microsoft/teamsfx-api";
import axios, { AxiosInstance, AxiosError } from "axios";
import { IAADDefinition } from "../../../resource/aadApp/interfaces/IAADDefinition";
import { AADApplication } from "../../../resource/aadApp/interfaces/AADApplication";
import { GraphScopes } from "../../../../common/tools";
import { Constants } from "../../../resource/aadApp/constants";
import axiosRetry from "axios-retry";

// Another implementation of src\component\resource\aadApp\graph.ts to reduce call stacks
// It's our internal utility so make sure pass valid parameters to it instead of relying on it to handle parameter errors
export class AadAppClient {
  private readonly retryNumber: number = 5;
  private readonly tokenProvider: M365TokenProvider;
  private readonly axios: AxiosInstance;

  constructor(m365TokenProvider: M365TokenProvider) {
    this.tokenProvider = m365TokenProvider;
    // Create axios instance which sets authorization header automatically before each MS Graph request
    this.axios = axios.create({
      baseURL: "https://graph.microsoft.com/v1.0",
    });
    this.axios.interceptors.request.use(async (config) => {
      const tokenResponse = await this.tokenProvider.getAccessToken({ scopes: GraphScopes });
      if (tokenResponse.isErr()) {
        throw tokenResponse.error;
      }
      const token = tokenResponse.value;

      if (!config.headers) {
        config.headers = {};
      }
      config.headers["Authorization"] = `Bearer ${token}`;

      return config;
    });
    // Add retry logic. Retry post request may result in creating additional resources but should be fine in AAD driver.
    axiosRetry(this.axios, {
      retries: this.retryNumber,
      retryDelay: axiosRetry.exponentialDelay, // exponetial delay time: Math.pow(2, retryNumber) * 100
      retryCondition: (error) =>
        axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error), // retry when there's network error or 5xx error
    });
  }

  public async createAadApp(displayName: string): Promise<AADApplication> {
    const requestBody: IAADDefinition = {
      displayName: displayName,
    }; // Create an AAD app without setting anything

    const response = await this.axios.post("applications", requestBody);

    return <AADApplication>response.data;
  }

  public async generateClientSecret(objectId: string): Promise<string> {
    const requestBody = {
      passwordCredential: {
        displayName: Constants.aadAppPasswordDisplayName,
      },
    };

    const response = await this.axios.post(`applications/${objectId}/addPassword`, requestBody, {
      "axios-retry": {
        retries: this.retryNumber,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) =>
          axiosRetry.isNetworkError(error) ||
          axiosRetry.isRetryableError(error) ||
          this.isHttpClientError(error), // also retry 4xx (usually 404) error since AAD need sometime to sync created AAD app data
      },
    });

    return response.data.secretText;
  }

  // only use it to retry 4xx errors for create client secret requests right after AAD app creation (usually 404)
  private isHttpClientError(error: AxiosError<any>): boolean {
    return (
      error.code !== "ECONNABORTED" &&
      (!error.response || (error.response.status >= 400 && error.response.status <= 499))
    );
  }
}

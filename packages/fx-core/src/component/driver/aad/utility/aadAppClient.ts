// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { M365TokenProvider } from "@microsoft/teamsfx-api";
import axios, { AxiosInstance, AxiosError } from "axios";
import { IAADDefinition } from "../../../resource/aadApp/interfaces/IAADDefinition";
import { AADApplication } from "../../../resource/aadApp/interfaces/AADApplication";
import { AADManifest } from "../../../resource/aadApp/interfaces/AADManifest";
import { AadManifestHelper } from "../../../resource/aadApp/utils/aadManifestHelper";
import { GraphScopes } from "../../../../common/tools";
import { Constants } from "../../../resource/aadApp/constants";
import axiosRetry from "axios-retry";
import { SignInAudience } from "../interface/signInAudience";

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

  public async createAadApp(
    displayName: string,
    signInAudience = SignInAudience.AzureADMyOrg
  ): Promise<AADApplication> {
    const requestBody: IAADDefinition = {
      displayName: displayName,
      signInAudience: signInAudience,
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
          this.is404Error(error), // also retry 404 error since AAD need sometime to sync created AAD app data
      },
    });

    return response.data.secretText;
  }

  public async updateAadApp(manifest: AADManifest): Promise<void> {
    const objectId = manifest.id!; // You need to ensure the object id exists in manifest
    const requestBody = AadManifestHelper.manifestToApplication(manifest);
    await this.axios.patch(`applications/${objectId}`, requestBody, {
      "axios-retry": {
        retries: this.retryNumber,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) =>
          axiosRetry.isNetworkError(error) ||
          axiosRetry.isRetryableError(error) ||
          this.is404Error(error) || // also retry 404 error since AAD need sometime to sync created AAD app data
          this.is400Error(error), // sometimes AAD will complain OAuth permission not found if we pre-authorize a newly created permission
      },
    });
  }

  // only use it to retry 404 errors for create client secret / update AAD app requests right after AAD app creation
  private is404Error(error: AxiosError<any>): boolean {
    return error.code !== "ECONNABORTED" && (!error.response || error.response.status === 404);
  }

  private is400Error(error: AxiosError<any>): boolean {
    return error.code !== "ECONNABORTED" && (!error.response || error.response.status === 400);
  }
}

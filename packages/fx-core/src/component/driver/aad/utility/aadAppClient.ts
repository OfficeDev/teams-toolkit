// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { LogProvider, M365TokenProvider } from "@microsoft/teamsfx-api";
import axios, { AxiosError, AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import { AadOwner } from "../../../../common/permissionInterface";
import { GraphScopes } from "../../../../common/tools";
import { ErrorContextMW } from "../../../../core/globalVars";
import { DeleteOrUpdatePermissionFailedError } from "../error/aadManifestError";
import { AADApplication } from "../interface/AADApplication";
import { AADManifest } from "../interface/AADManifest";
import { IAADDefinition } from "../interface/IAADDefinition";
import { SignInAudience } from "../interface/signInAudience";
import { AadManifestHelper } from "./aadManifestHelper";
import { aadErrorCode, constants } from "./constants";
import { getLocalizedString } from "../../../../common/localizeUtils";
// Another implementation of src\component\resource\aadApp\graph.ts to reduce call stacks
// It's our internal utility so make sure pass valid parameters to it instead of relying on it to handle parameter errors
export class AadAppClient {
  private readonly retryNumber: number = 5;
  private readonly tokenProvider: M365TokenProvider;
  private readonly axios: AxiosInstance;
  private readonly baseUrl: string = "https://graph.microsoft.com/v1.0";

  constructor(m365TokenProvider: M365TokenProvider) {
    this.tokenProvider = m365TokenProvider;
    // Create axios instance which sets authorization header automatically before each MS Graph request
    this.axios = axios.create({
      baseURL: this.baseUrl,
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
  @hooks([ErrorContextMW({ source: "Graph", component: "AadAppClient" })])
  public async createAadApp(
    displayName: string,
    signInAudience = SignInAudience.AzureADMyOrg,
    logProvider?: LogProvider
  ): Promise<AADApplication> {
    const requestBody: IAADDefinition = {
      displayName: displayName,
      signInAudience: signInAudience,
    }; // Create an AAD app without setting anything

    logProvider?.debug(
      getLocalizedString("core.common.SentApiRequest", `${this.baseUrl}/applications`, JSON.stringify(requestBody))
    );
    const response = await this.axios.post("applications", requestBody);
    logProvider?.debug(
      getLocalizedString("core.common.ReceiveApiResponse", JSON.stringify(response.data))
    );

    return <AADApplication>response.data;
  }
  @hooks([ErrorContextMW({ source: "Graph", component: "AadAppClient" })])
  public async generateClientSecret(
    objectId: string,
    logProvider?: LogProvider
  ): Promise<string> {
    const requestBody = {
      passwordCredential: {
        displayName: constants.aadAppPasswordDisplayName,
      },
    };

    logProvider?.debug(
      getLocalizedString("core.common.SentApiRequest", `${this.baseUrl}/applications/{aadObjectId}/addPassword`, JSON.stringify(requestBody))
    );
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
    logProvider?.debug(
      getLocalizedString("core.common.ReceiveApiResponse", JSON.stringify(response.data))
    );

    return response.data.secretText;
  }

  @hooks([ErrorContextMW({ source: "Graph", component: "AadAppClient" })])
  public async updateAadApp(
    manifest: AADManifest,
    logProvider?: LogProvider
  ): Promise<void> {
    const objectId = manifest.id!; // You need to ensure the object id exists in manifest
    const requestBody = AadManifestHelper.manifestToApplication(manifest);
    try {
      logProvider?.debug(
        getLocalizedString("core.common.SentApiRequest", `${this.baseUrl}/applications/{aadObjectId}`, JSON.stringify(requestBody))
      );
      const response = await this.axios.patch(`applications/${objectId}`, requestBody, {
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
      logProvider?.debug(
        getLocalizedString("core.common.ReceiveApiResponse", JSON.stringify(response.data))
      );
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.response &&
        err.response.status === 400 &&
        err.response.data.error.code === aadErrorCode.permissionErrorCode
      ) {
        throw new DeleteOrUpdatePermissionFailedError(AadAppClient.name);
      }
      throw err;
    }
  }
  @hooks([ErrorContextMW({ source: "Graph", component: "AadAppClient" })])
  public async getOwners(
    objectId: string,
    logProvider?: LogProvider,
  ): Promise<AadOwner[] | undefined> {
    logProvider?.debug(
      getLocalizedString("core.common.SentApiRequest", `${this.baseUrl}/applications/{aadObjectId}/owners`, "")
    );
    const response = await this.axios.get(`applications/${objectId}/owners`, {
      "axios-retry": {
        retries: this.retryNumber,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) =>
          axiosRetry.isNetworkError(error) ||
          axiosRetry.isRetryableError(error) ||
          this.is404Error(error), // also retry 404 error since AAD need sometime to sync created AAD app data
      },
    });
    logProvider?.debug(
      getLocalizedString("core.common.ReceiveApiResponse", JSON.stringify(response.data))
    );

    const aadOwners: AadOwner[] = [];
    for (const aadOwner of response.data.value) {
      aadOwners.push({
        userObjectId: aadOwner.id,
        resourceId: objectId,
        displayName: aadOwner.displayName,
        // For guest account, aadOwner.userPrincipalName will contains "EXT", thus use mail instead.
        userPrincipalName: aadOwner.mail ?? aadOwner.userPrincipalName,
      });
    }

    return aadOwners;
  }
  @hooks([ErrorContextMW({ source: "Graph", component: "AadAppClient" })])
  public async addOwner(
    objectId: string,
    userObjectId: string,
    logProvider?: LogProvider,
  ): Promise<void> {
    const requestBody = {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      "@odata.id": `${this.axios.defaults.baseURL}/directoryObjects/${userObjectId}`,
    };

    logProvider?.debug(
      getLocalizedString("core.common.SentApiRequest", `${this.baseUrl}/applications/{aadObjectId}/owners/$ref`, "")
    );
    const response = await this.axios.post(`applications/${objectId}/owners/$ref`, requestBody, {
      "axios-retry": {
        retries: this.retryNumber,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) =>
          axiosRetry.isNetworkError(error) ||
          axiosRetry.isRetryableError(error) ||
          this.is404Error(error), // also retry 404 error since AAD need sometime to sync created AAD app data
      },
    });
    logProvider?.debug(
      getLocalizedString("core.common.ReceiveApiResponse", JSON.stringify(response.data))
    );
  }

  // only use it to retry 404 errors for create client secret / update AAD app requests right after AAD app creation
  private is404Error(error: AxiosError<any>): boolean {
    return error.code !== "ECONNABORTED" && (!error.response || error.response.status === 404);
  }

  private is400Error(error: AxiosError<any>): boolean {
    return error.code !== "ECONNABORTED" && (!error.response || error.response.status === 400);
  }
}

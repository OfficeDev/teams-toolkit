// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AppStudioErrorMessage } from "./errors";
import { IAADPassword } from "./interfaces/IAADApplication";
import { IAADDefinition } from "./interfaces/IAADDefinition";

import axios from "axios";
const baseUrl = `https://dev.teams.microsoft.com`;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AppStudio {
  export async function createAADAppV2(
    appStudioToken: string,
    aadApp: IAADDefinition
  ): Promise<IAADDefinition> {
    if (!aadApp) {
      throw new Error(
        `${AppStudioErrorMessage.CreateFailed}: ${AppStudioErrorMessage.AppDefinitionIsNull}.`
      );
    }

    const instance = initAxiosInstance(appStudioToken);
    const response = await instance.post(`${baseUrl}/api/aadapp/v2`, aadApp);
    if (response && response.data) {
      const app = <IAADDefinition>response.data;

      if (app) {
        return app;
      }
    }

    throw new Error(
      `${AppStudioErrorMessage.CreateFailed}: ${AppStudioErrorMessage.EmptyResponse}.`
    );
  }

  export async function updateAADApp(
    appStudioToken: string,
    appId: string,
    aadApp: IAADDefinition
  ): Promise<void> {
    if (!aadApp) {
      throw new Error(
        `${AppStudioErrorMessage.UpdateFailed}: ${AppStudioErrorMessage.AppDefinitionIsNull}.`
      );
    }

    if (!appId) {
      throw new Error(
        `${AppStudioErrorMessage.UpdateFailed}: ${AppStudioErrorMessage.AppObjectIdIsNull}.`
      );
    }

    const instance = initAxiosInstance(appStudioToken);
    await instance.post(`${baseUrl}/api/aadapp/${appId}`, aadApp);
  }

  export async function createAADAppPassword(
    appStudioToken: string,
    aadAppObjectId: string
  ): Promise<IAADPassword> {
    if (!aadAppObjectId) {
      throw new Error(
        `${AppStudioErrorMessage.CreateSecretFailed}: ${AppStudioErrorMessage.AppObjectIdIsNull}.`
      );
    }

    const instance = initAxiosInstance(appStudioToken);
    const response = await instance.post(`${baseUrl}/api/aadapp/${aadAppObjectId}/passwords`);
    if (response && response.data) {
      const app = <IAADPassword>response.data;

      if (app) {
        return app;
      }
    }

    throw new Error(
      `${AppStudioErrorMessage.CreateSecretFailed}: ${AppStudioErrorMessage.EmptyResponse}.`
    );
  }

  export async function getAadApp(
    appStudioToken: string,
    aadAppObjectId: string
  ): Promise<IAADDefinition> {
    if (!aadAppObjectId) {
      throw new Error(
        `${AppStudioErrorMessage.GetFailed}: ${AppStudioErrorMessage.AppObjectIdIsNull}.`
      );
    }

    const instance = initAxiosInstance(appStudioToken);
    const response = await instance.get(`${baseUrl}/api/aadapp/v2/${aadAppObjectId}`);
    if (response && response.data) {
      const app = <IAADDefinition>response.data;

      if (app) {
        return app;
      }
    }

    throw new Error(`${AppStudioErrorMessage.GetFailed}: ${AppStudioErrorMessage.EmptyResponse}.`);
  }

  function initAxiosInstance(appStudioToken: string) {
    const instance = axios.create({
      baseURL: baseUrl,
    });
    instance.defaults.headers.common["Authorization"] = `Bearer ${appStudioToken}`;
    instance.interceptors.request.use(function (config) {
      config.params = { teamstoolkit: true, ...config.params };
      return config;
    });
    return instance;
  }
}

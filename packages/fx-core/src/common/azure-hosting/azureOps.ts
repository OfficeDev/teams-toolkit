// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as appService from "@azure/arm-appservice";
import { default as axios } from "axios";
import {
  DeployStatusError,
  DeployTimeoutError,
  ListPublishingCredentialsError,
  RestartWebAppError,
  ZipDeployError,
} from "./hostingError";
import { DeployStatusConstant } from "./hostingConstant";
import { waitSeconds } from "../tools";
import {
  AxiosOnlyStatusResult,
  AxiosResponseWithStatusResult,
  AxiosZipDeployResult,
  AzurePublishingCredentials,
  AzureUploadConfig,
  Logger,
} from "./interfaces";
import { Messages } from "./messages";
import { WebAppsListPublishingCredentialsResponse } from "@azure/arm-appservice";

/**
 * operate int azure
 */
export class AzureOperations {
  public static readonly axiosInstance = axios.create();

  public static async listPublishingCredentials(
    webSiteMgmtClient: appService.WebSiteManagementClient,
    resourceGroup: string,
    siteName: string
  ): Promise<WebAppsListPublishingCredentialsResponse> {
    let listResponse: WebAppsListPublishingCredentialsResponse;
    try {
      listResponse = await webSiteMgmtClient.webApps.beginListPublishingCredentialsAndWait(
        resourceGroup,
        siteName
      );
    } catch (e) {
      throw new ListPublishingCredentialsError(e);
    }

    if (!listResponse) {
      throw new ListPublishingCredentialsError();
    }

    return listResponse;
  }

  public static async zipDeployPackage(
    zipDeployEndpoint: string,
    zipBuffer: Buffer,
    config: AzureUploadConfig,
    logger?: Logger
  ): Promise<string> {
    let res: AxiosZipDeployResult;
    try {
      res = await AzureOperations.axiosInstance.post(zipDeployEndpoint, zipBuffer, config);
    } catch (e) {
      throw new ZipDeployError(e);
    }

    if (!res || !isHttpCodeAccepted(res?.status)) {
      if (res?.status) {
        logger?.error?.(Messages.deployFailed(res.status));
      }
      throw new ZipDeployError();
    }

    return res.headers.location;
  }

  public static async checkDeployStatus(
    location: string,
    config: AzureUploadConfig,
    logger?: Logger
  ): Promise<void> {
    let res: AxiosOnlyStatusResult;
    for (let i = 0; i < DeployStatusConstant.RETRY_TIMES; ++i) {
      try {
        res = await AzureOperations.axiosInstance.get(location, config);
      } catch (e) {
        throw new DeployStatusError(e);
      }

      if (res) {
        if (isHttpCodeAccepted(res?.status)) {
          await waitSeconds(DeployStatusConstant.BACKOFF_TIME_S);
        } else if (isHttpCodeOkOrCreated(res?.status)) {
          return;
        } else {
          if (res.status) {
            logger?.error?.(Messages.deployFailed(res.status));
          }
          throw new DeployStatusError();
        }
      }
    }

    throw new DeployTimeoutError();
  }

  public static async restartWebApp(
    webSiteMgmtClient: appService.WebSiteManagementClient,
    resourceGroup: string,
    siteName: string,
    logger?: Logger
  ): Promise<void> {
    logger?.info?.(Messages.restartFunction(siteName));
    try {
      await webSiteMgmtClient.webApps.restart(resourceGroup, siteName);
    } catch (e) {
      throw new RestartWebAppError(e);
    }
  }
}

export function isHttpCodeOkOrCreated(code: number | undefined): boolean {
  return code !== undefined && [200, 201].includes(code);
}

export function isHttpCodeAccepted(code: number | undefined): boolean {
  return code === 202;
}

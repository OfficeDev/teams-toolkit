// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";

import { LogProvider } from "@microsoft/teamsfx-api";

import { waitSeconds } from "../tools";
import { NotExtendedToM365Error } from "./errors";
import { assembleError } from "../../error/common";
import { ErrorContextMW } from "../../core/globalVars";
import { hooks } from "@feathersjs/hooks";

const M365ErrorSource = "M365";
const M365ErrorComponent = "PackageService";

// Call m365 service for package CRUD
export class PackageService {
  private readonly axiosInstance;
  private readonly initEndpoint;
  private readonly logger: LogProvider | undefined;

  public constructor(endpoint: string, logger?: LogProvider) {
    this.axiosInstance = axios.create({
      timeout: 30000,
    });
    this.initEndpoint = endpoint;
    this.logger = logger;
  }
  @hooks([ErrorContextMW({ source: M365ErrorSource, component: M365ErrorComponent })])
  private async getTitleServiceUrl(token: string): Promise<string> {
    try {
      try {
        new URL(this.initEndpoint);
      } catch (_) {
        throw new Error("Invalid URL. Mis-configuration SIDELOADING_SERVICE_ENDPOINT.");
      }

      const envInfo = await this.axiosInstance.get("/config/v1/environment", {
        baseURL: this.initEndpoint,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      this.logger?.debug(JSON.stringify(envInfo.data));
      new URL(envInfo.data.titlesServiceUrl);
      return envInfo.data.titlesServiceUrl;
    } catch (error: any) {
      this.logger?.error(`Get ServiceUrl failed. ${error.message as string}`);
      throw error;
    }
  }

  @hooks([ErrorContextMW({ source: M365ErrorSource, component: M365ErrorComponent })])
  public async sideLoading(token: string, manifestPath: string): Promise<[string, string]> {
    try {
      const data = await fs.readFile(manifestPath);
      const content = new FormData();
      content.append("package", data);
      const serviceUrl = await this.getTitleServiceUrl(token);
      this.logger?.verbose("Uploading package ...");
      const uploadHeaders = content.getHeaders();
      uploadHeaders["Authorization"] = `Bearer ${token}`;
      const uploadResponse = await this.axiosInstance.post(
        "/dev/v1/users/packages",
        content.getBuffer(),
        {
          baseURL: serviceUrl,
          headers: uploadHeaders,
        }
      );

      const operationId = uploadResponse.data.operationId;
      this.logger?.debug(`Package uploaded. OperationId: ${operationId as string}`);

      this.logger?.verbose("Acquiring package ...");
      const acquireResponse = await this.axiosInstance.post(
        "/dev/v1/users/packages/acquisitions",
        {
          operationId: operationId,
        },
        {
          baseURL: serviceUrl,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const statusId = acquireResponse.data.statusId;
      this.logger?.debug(`Acquiring package with statusId: ${statusId as string} ...`);

      do {
        const statusResponse = await this.axiosInstance.get(
          `/dev/v1/users/packages/status/${statusId as string}`,
          {
            baseURL: serviceUrl,
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const resCode = statusResponse.status;
        this.logger?.debug(`Package status: ${resCode} ...`);
        if (resCode === 200) {
          const titleId: string = statusResponse.data.titleId;
          const appId: string = statusResponse.data.appId;
          this.logger?.info(`TitleId: ${titleId}`);
          this.logger?.info(`AppId: ${appId}`);
          this.logger?.verbose("Sideloading done.");
          return [titleId, appId];
        } else {
          await waitSeconds(2);
        }
      } while (true);
    } catch (error: any) {
      this.logger?.error("Sideloading failed.");
      if (error.response) {
        this.logger?.error(JSON.stringify(error.response.data));
        this.traceError(error);
      } else {
        this.logger?.error(error.message);
      }
      throw assembleError(error, M365ErrorSource);
    }
  }
  @hooks([ErrorContextMW({ source: M365ErrorSource, component: M365ErrorComponent })])
  public async getLaunchInfoByManifestId(token: string, manifestId: string): Promise<any> {
    try {
      const serviceUrl = await this.getTitleServiceUrl(token);
      this.logger?.verbose(`Getting LaunchInfo with ManifestId ${manifestId} ...`);
      const launchInfo = await this.axiosInstance.post(
        "/catalog/v1/users/titles/launchInfo",
        {
          Id: manifestId,
          IdType: "ManifestId",
          Filter: {
            SupportedElementTypes: [
              // "Extensions", // Extensions require ClientDetails to be determined later
              "OfficeAddIns",
              "ExchangeAddIns",
              "FirstPartyPages",
              "Dynamics",
              "AAD",
              "LineOfBusiness",
              "StaticTabs",
              "ComposeExtensions",
              "Bots",
              "GraphConnector",
              "ConfigurableTabs",
              "Activities",
              "MeetingExtensionDefinition",
            ],
          },
        },
        {
          baseURL: serviceUrl,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      this.logger?.debug(JSON.stringify(launchInfo.data));
      return launchInfo.data;
    } catch (error: any) {
      this.logger?.error("Get LaunchInfo failed.");
      if (error.response) {
        this.logger?.error(JSON.stringify(error.response.data));
        this.traceError(error);
        if (error.response.status === 404) {
          throw new NotExtendedToM365Error(M365ErrorSource);
        }
      } else {
        this.logger?.error(error.message);
      }
      throw assembleError(error, M365ErrorSource);
    }
  }
  @hooks([ErrorContextMW({ source: M365ErrorSource, component: M365ErrorComponent })])
  public async retrieveTitleId(token: string, manifestId: string): Promise<string> {
    const launchInfo = await this.getLaunchInfoByManifestId(token, manifestId);
    const titleId =
      (launchInfo.acquisition?.titleId?.id as string) ??
      (launchInfo.acquisition?.titleId as string);
    this.logger?.debug(`TitleId: ${titleId}`);
    return titleId;
  }

  public async retrieveAppId(token: string, manifestId: string): Promise<string | undefined> {
    const launchInfo = await this.getLaunchInfoByManifestId(token, manifestId);
    const appId = launchInfo.acquisition?.appId;
    this.logger?.debug(`AppId: ${appId as string}`);
    return appId;
  }
  @hooks([ErrorContextMW({ source: M365ErrorSource, component: M365ErrorComponent })])
  public async unacquire(token: string, titleId: string): Promise<void> {
    try {
      const serviceUrl = await this.getTitleServiceUrl(token);
      this.logger?.verbose(`Unacquiring package with TitleId ${titleId} ...`);
      await this.axiosInstance.delete(`/catalog/v1/users/acquisitions/${titleId}`, {
        baseURL: serviceUrl,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      this.logger?.verbose("Unacquiring done.");
    } catch (error: any) {
      this.logger?.error("Unacquire failed.");
      if (error.response) {
        this.logger?.error(JSON.stringify(error.response.data));
        this.traceError(error);
      } else {
        this.logger?.error(error.message);
      }

      throw assembleError(error, M365ErrorSource);
    }
  }
  @hooks([ErrorContextMW({ source: M365ErrorSource, component: M365ErrorComponent })])
  public async getLaunchInfoByTitleId(token: string, titleId: string): Promise<unknown> {
    try {
      const serviceUrl = await this.getTitleServiceUrl(token);
      this.logger?.verbose(`Getting LaunchInfo with TitleId ${titleId} ...`);
      const launchInfo = await this.axiosInstance.get(
        `/catalog/v1/users/titles/${titleId}/launchInfo`,
        {
          baseURL: serviceUrl,
          params: {
            SupportedElementTypes:
              // eslint-disable-next-line no-secrets/no-secrets
              "Extensions,OfficeAddIns,ExchangeAddIns,FirstPartyPages,Dynamics,AAD,LineOfBusiness,StaticTabs,ComposeExtensions,Bots,GraphConnector,ConfigurableTabs,Activities,MeetingExtensionDefinition",
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      this.logger?.info(JSON.stringify(launchInfo.data));
      return launchInfo.data;
    } catch (error: any) {
      this.logger?.error("Get LaunchInfo failed.");
      if (error.response) {
        this.logger?.error(JSON.stringify(error.response.data));
        this.traceError(error);
      } else {
        this.logger?.error(error.message);
      }

      throw assembleError(error, M365ErrorSource);
    }
  }

  private traceError(error: any) {
    // add error details and trace to message
    const detail = JSON.stringify(error.response.data ?? {});
    const tracingId = error.response.headers?.traceresponse ?? "";
    const originalMessage = error.message;
    error.message = JSON.stringify({
      message: originalMessage,
      detail: detail,
      tracingId: tracingId,
    });
  }
}

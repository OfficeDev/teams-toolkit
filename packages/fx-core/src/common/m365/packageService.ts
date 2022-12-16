// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";

import { LogProvider } from "@microsoft/teamsfx-api";

import { waitSeconds } from "../tools";

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

  private async getTitleServiceUrl(token: string): Promise<string> {
    try {
      const envInfo = await this.axiosInstance.get("/config/v1/environment", {
        baseURL: this.initEndpoint,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      this.logger?.debug(JSON.stringify(envInfo.data));
      return envInfo.data.titlesServiceUrl;
    } catch (error: any) {
      this.logger?.error(`Get ServiceUrl failed. ${error.message}`);
      throw error;
    }
  }

  public async sideLoading(token: string, manifestPath: string): Promise<void> {
    try {
      const data = await fs.readFile(manifestPath);
      const content = new FormData();
      content.append("package", data);
      const serviceUrl = await this.getTitleServiceUrl(token);
      this.logger?.info("Uploading package ...");
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
      const titleId = uploadResponse.data.titlePreview.titleId;
      this.logger?.debug(`Package uploaded. OperationId: ${operationId}, TitleId: ${titleId}`);

      this.logger?.info("Acquiring package ...");
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
      this.logger?.debug(`Acquiring package with statusId: ${statusId} ...`);

      let complete = false;
      do {
        const statusResponse = await this.axiosInstance.get(
          `/dev/v1/users/packages/status/${statusId}`,
          {
            baseURL: serviceUrl,
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const resCode = statusResponse.status;
        if (resCode === 200) {
          complete = true;
        } else {
          await waitSeconds(2);
        }
      } while (complete === false);

      this.logger?.info(`Acquire done. App TitleId: ${titleId}`);

      this.logger?.info("Checking acquired package ...");
      const launchInfo = await this.axiosInstance.get(
        `/catalog/v1/users/titles/${titleId}/launchInfo`,
        {
          baseURL: serviceUrl,
          params: {
            SupportedElementTypes:
              // eslint-disable-next-line no-secrets/no-secrets
              "Extension,OfficeAddIn,ExchangeAddIn,FirstPartyPages,Dynamics,AAD,LineOfBusiness,LaunchPage,MessageExtension,Bot",
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      this.logger?.debug(JSON.stringify(launchInfo.data));
      this.logger?.info("Sideloading done.");
    } catch (error: any) {
      this.logger?.error("Sideloading failed.");
      if (error.response) {
        this.logger?.error(JSON.stringify(error.response.data));
      } else {
        this.logger?.error(error.message);
      }
      throw error;
    }
  }

  public async retrieveTitleId(token: string, manifestId: string): Promise<string> {
    try {
      const serviceUrl = await this.getTitleServiceUrl(token);
      this.logger?.info("Retrieve TitleId ...");
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

      const titleId =
        (launchInfo.data.acquisition?.titleId?.id as string) ??
        (launchInfo.data.acquisition?.titleId as string);
      this.logger?.debug(`TitleId: ${titleId}`);
      return titleId;
    } catch (error: any) {
      this.logger?.error("Retrieve TitleId failed.");
      if (error.response) {
        this.logger?.error(JSON.stringify(error.response.data));
      } else {
        this.logger?.error(error.message);
      }

      throw error;
    }
  }

  public async unacquire(token: string, titleId: string): Promise<void> {
    try {
      const serviceUrl = await this.getTitleServiceUrl(token);
      this.logger?.info(`Unacquiring package with TitleId ${titleId} ...`);
      await this.axiosInstance.delete(`/catalog/v1/users/acquisitions/${titleId}`, {
        baseURL: serviceUrl,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      this.logger?.info("Unacquiring done.");
    } catch (error: any) {
      this.logger?.error("Unacquire failed.");
      if (error.response) {
        this.logger?.error(JSON.stringify(error.response.data));
      } else {
        this.logger?.error(error.message);
      }

      throw error;
    }
  }

  public async getLaunchInfo(token: string, titleId: string): Promise<unknown> {
    try {
      const serviceUrl = await this.getTitleServiceUrl(token);
      this.logger?.info(`Getting LaunchInfo with TitleId ${titleId} ...`);
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
      } else {
        this.logger?.error(error.message);
      }

      throw error;
    }
  }
}

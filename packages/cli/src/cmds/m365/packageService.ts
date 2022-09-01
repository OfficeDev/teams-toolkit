// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";

import { LogLevel } from "@microsoft/teamsfx-api";

import CLILogProvider from "../../commonlib/log";
import { sleep } from "../../utils";

export class PackageService {
  private readonly axiosInstance;
  public constructor(endpoint: string) {
    this.axiosInstance = axios.create({
      baseURL: endpoint,
      timeout: 30000,
    });
  }

  public async sideLoading(token: string, manifestPath: string): Promise<void> {
    try {
      const data = await fs.readFile(manifestPath);
      const content = new FormData();
      content.append("package", data);
      CLILogProvider.necessaryLog(LogLevel.Info, "Uploading package ...");
      const uploadHeaders = content.getHeaders();
      uploadHeaders["Authorization"] = `Bearer ${token}`;
      const uploadResponse = await this.axiosInstance.post(
        "/dev/v1/users/packages",
        content.getBuffer(),
        {
          headers: uploadHeaders,
        }
      );

      const operationId = uploadResponse.data.operationId;
      const titleId = uploadResponse.data.titlePreview.titleId;
      CLILogProvider.debug(`Package uploaded. OperationId: ${operationId}, TitleId: ${titleId}`);

      CLILogProvider.necessaryLog(LogLevel.Info, "Acquiring package ...");
      const acquireResponse = await this.axiosInstance.post(
        "/dev/v1/users/packages/acquisitions",
        {
          operationId: operationId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const statusId = acquireResponse.data.statusId;
      CLILogProvider.debug(`Acquiring package with statusId: ${statusId} ...`);

      let complete = false;
      do {
        const statusResponse = await this.axiosInstance.get(
          `/dev/v1/users/packages/status/${statusId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const resCode = statusResponse.status;
        if (resCode === 200) {
          complete = true;
        } else {
          await sleep(2000);
        }
      } while (complete === false);

      CLILogProvider.necessaryLog(LogLevel.Info, `Acquire done. App TitleId: ${titleId}`);

      CLILogProvider.necessaryLog(LogLevel.Info, "Checking acquired package ...");
      const launchInfo = await this.axiosInstance.get(
        `/catalog/v1/users/titles/${titleId}/launchInfo`,
        {
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
      CLILogProvider.debug(JSON.stringify(launchInfo.data));
      CLILogProvider.necessaryLog(LogLevel.Info, "Sideloading done.");
    } catch (error: any) {
      CLILogProvider.necessaryLog(LogLevel.Error, "Sideloading failed.");
      if (error.response) {
        CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(error.response.data));
      } else {
        CLILogProvider.necessaryLog(LogLevel.Error, error.message);
      }
      throw error;
    }
  }

  public async retrieveTitleId(token: string, manifestPath: string): Promise<string> {
    try {
      const data = await fs.readFile(manifestPath);
      const content = new FormData();
      content.append("package", data);
      CLILogProvider.necessaryLog(LogLevel.Info, "Retrieve TitleId ...");
      const uploadHeaders = content.getHeaders();
      uploadHeaders["Authorization"] = `Bearer ${token}`;
      const uploadResponse = await this.axiosInstance.post(
        "/dev/v1/users/packages",
        content.getBuffer(),
        {
          headers: uploadHeaders,
        }
      );

      const titleId = uploadResponse.data.titlePreview.titleId;
      CLILogProvider.debug(`TitleId: ${titleId}`);
      return titleId;
    } catch (error: any) {
      CLILogProvider.necessaryLog(LogLevel.Error, "Retrieve TitleId failed.");
      if (error.response) {
        CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(error.response.data));
      } else {
        CLILogProvider.necessaryLog(LogLevel.Error, error.message);
      }

      throw error;
    }
  }

  public async unacquire(token: string, titleId: string): Promise<void> {
    try {
      CLILogProvider.necessaryLog(LogLevel.Info, `Unacquiring package with TitleId ${titleId} ...`);
      await this.axiosInstance.delete(`/catalog/v1/users/acquisitions/${titleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      CLILogProvider.necessaryLog(LogLevel.Info, "Unacquiring done.");
    } catch (error: any) {
      CLILogProvider.necessaryLog(LogLevel.Error, "Unacquire failed.");
      if (error.response) {
        CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(error.response.data));
      } else {
        CLILogProvider.necessaryLog(LogLevel.Error, error.message);
      }

      throw error;
    }
  }

  public async getLaunchInfo(token: string, titleId: string): Promise<void> {
    try {
      CLILogProvider.necessaryLog(LogLevel.Info, `Getting LaunchInfo with TitleId ${titleId} ...`);
      const launchInfo = await this.axiosInstance.get(
        `/catalog/v1/users/titles/${titleId}/launchInfo`,
        {
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
      CLILogProvider.necessaryLog(LogLevel.Info, JSON.stringify(launchInfo.data), true);
    } catch (error: any) {
      CLILogProvider.necessaryLog(LogLevel.Error, "Get LaunchInfo failed.");
      if (error.response) {
        CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(error.response.data));
      } else {
        CLILogProvider.necessaryLog(LogLevel.Error, error.message);
      }

      throw error;
    }
  }
}

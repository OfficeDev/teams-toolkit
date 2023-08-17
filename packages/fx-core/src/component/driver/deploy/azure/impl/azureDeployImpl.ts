// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  DeployStepArgs,
  AzureUploadConfig,
  DeployArgs,
  AxiosDeployQueryResult,
  DeployResult,
} from "../../../interface/buildAndDeployArgs";
import { checkMissingArgs } from "../../../../utils/common";
import { LogProvider } from "@microsoft/teamsfx-api";
import { BaseDeployImpl } from "./baseDeployImpl";
import { Base64 } from "js-base64";
import * as appService from "@azure/arm-appservice";
import { DeployConstant, DeployStatus } from "../../../../constant/deployConstant";
import { default as axios } from "axios";
import { waitSeconds } from "../../../../../common/tools";
import { HttpStatusCode } from "../../../../constant/commonConstant";
import {
  getAzureAccountCredential,
  parseAzureResourceId,
} from "../../../../utils/azureResourceOperation";
import { AzureResourceInfo } from "../../../interface/commonArgs";
import { TokenCredential } from "@azure/identity";
import * as fs from "fs-extra";
import { PrerequisiteError } from "../../../../error/componentError";
import { wrapAzureOperation } from "../../../../utils/azureSdkErrorHandler";
import { getDefaultString, getLocalizedString } from "../../../../../common/localizeUtils";
import {
  CheckDeploymentStatusError,
  CheckDeploymentStatusTimeoutError,
  GetPublishingCredentialsError,
} from "../../../../../error/deploy";

export abstract class AzureDeployImpl extends BaseDeployImpl {
  protected managementClient: appService.WebSiteManagementClient | undefined;

  public static readonly AXIOS_INSTANCE = axios.create();

  /**
   * the pattern that used to parse resource id and extract info from it
   */
  abstract pattern: RegExp;

  protected prepare?: (args: DeployStepArgs) => Promise<void> = undefined;

  async deploy(args: DeployArgs): Promise<boolean> {
    // check root path exists
    if (!(await fs.pathExists(this.workingDirectory))) {
      throw PrerequisiteError.folderNotExists(
        DeployConstant.DEPLOY_ERROR_TYPE,
        this.workingDirectory,
        this.helpLink
      );
    }
    // check distribution folder exists
    if (!(await fs.pathExists(this.distDirectory))) {
      throw PrerequisiteError.folderNotExists(
        DeployConstant.DEPLOY_ERROR_TYPE,
        this.distDirectory,
        this.helpLink
      );
    }
    const resourceId = checkMissingArgs("resourceId", args.resourceId);
    const azureResource = this.parseResourceId(resourceId);
    const azureCredential = await getAzureAccountCredential(this.context.azureAccountProvider);
    const inputs = { ignoreFile: args.ignoreFile };

    if (args.dryRun && this.prepare) {
      await this.prepare(inputs);
      return false;
    }
    await this.azureDeploy(inputs, azureResource, azureCredential);
    return true;
  }

  /**
   * real azure deploy logic
   * @param args local file needed to be deployed
   * @param azureResource azure resource info
   * @param azureCredential azure user login credential
   */
  abstract azureDeploy(
    args: DeployStepArgs,
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredential
  ): Promise<void>;

  /**
   * check if resource id is legal and parse it
   * @param resourceId deploy target
   * @protected
   */
  protected parseResourceId(resourceId: string): AzureResourceInfo {
    return parseAzureResourceId(resourceId, this.pattern);
  }

  /**
   * loop and check azure deployment status
   * by default, it will wait for 120 minutes
   * @param location azure deployment location
   * @param config azure upload config, including azure account credential
   * @param logger log provider
   * @protected
   */
  public async checkDeployStatus(
    location: string,
    config: AzureUploadConfig,
    logger: LogProvider
  ): Promise<DeployResult | undefined> {
    let res: AxiosDeployQueryResult;
    for (let i = 0; i < DeployConstant.DEPLOY_CHECK_RETRY_TIMES; ++i) {
      try {
        res = await AzureDeployImpl.AXIOS_INSTANCE.get(location, config);
      } catch (e) {
        if (axios.isAxiosError(e)) {
          logger.error(
            `Check deploy status failed with response status code: ${
              e.response?.status ?? "NA"
            }, message: ${JSON.stringify(e.response?.data)}`
          );
          throw new CheckDeploymentStatusError(
            location,
            new Error(
              `status code: ${e.response?.status ?? "NA"}, message: ${JSON.stringify(
                e.response?.data
              )}`
            ),
            this.helpLink
          );
        }
        throw new CheckDeploymentStatusError(location, e as Error, this.helpLink);
      }

      if (res) {
        if (res?.status === HttpStatusCode.ACCEPTED) {
          await waitSeconds(DeployConstant.BACKOFF_TIME_S);
        } else if (res?.status === HttpStatusCode.OK || res?.status === HttpStatusCode.CREATED) {
          if (res.data?.status === DeployStatus.Failed) {
            this.logger.warning(
              getDefaultString(
                "error.deploy.DeployRemoteStartError",
                location,
                JSON.stringify(res.data)
              )
            );
          }
          return res.data;
        } else {
          if (res.status) {
            logger.error(`Deployment is failed with error code: ${res.status}.`);
          }
          throw new CheckDeploymentStatusError(
            location,
            new Error(`status code: ${res.status ?? "NA"}`),
            this.helpLink
          );
        }
      }
    }

    throw new CheckDeploymentStatusTimeoutError(this.helpLink);
  }

  /**
   * create azure deploy config for Azure Function and Azure App service
   * @param azureResource azure resource info
   * @param azureCredential user azure credential
   */
  async createAzureDeployConfig(
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredential
  ): Promise<AzureUploadConfig> {
    this.managementClient = new appService.WebSiteManagementClient(
      azureCredential,
      azureResource.subscriptionId
    );
    try {
      const defaultScope = "https://management.azure.com/.default";
      const token = await azureCredential.getToken(defaultScope);
      if (token) {
        this.logger.info("Get AAD token successfully. Upload zip package through AAD Auth mode.");
        return {
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "no-cache",
            Authorization: `Bearer ${token.token}`,
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: DeployConstant.DEPLOY_TIMEOUT_IN_MS,
        };
      } else {
        this.context.telemetryReporter.sendTelemetryErrorEvent("Get-Deploy-AAD-token-failed", {
          error: "AAD token is empty.",
        });
        this.logger.info(
          "Get AAD token failed. AAD Token is empty. Upload zip package through basic auth mode. Please check your Azure credential."
        );
      }
    } catch (e) {
      this.context.telemetryReporter.sendTelemetryErrorEvent("Get-Deploy-AAD-token-failed", {
        error: (e as Error).toString(),
      });
      this.logger.info(
        `Get AAD token failed with error: ${JSON.stringify(
          e
        )}. Upload zip package through basic auth mode.`
      );
    }

    // IF only enable AAD deploy, throw error
    if (process.env["TEAMSFX_AAD_DEPLOY_ONLY"] === "true") {
      throw new GetPublishingCredentialsError(
        azureResource.instanceId,
        azureResource.resourceGroupName,
        new Error("Get AAD token failed."),
        this.helpLink
      );
    }

    const managementClient = this.managementClient;
    const listResponse = await wrapAzureOperation(
      () =>
        managementClient.webApps.beginListPublishingCredentialsAndWait(
          azureResource.resourceGroupName,
          azureResource.instanceId
        ),
      (e) =>
        new GetPublishingCredentialsError(
          azureResource.instanceId,
          azureResource.resourceGroupName,
          e as Error,
          this.helpLink
        ),
      (e) =>
        new GetPublishingCredentialsError(
          azureResource.instanceId,
          azureResource.resourceGroupName,
          e as Error,
          this.helpLink
        )
    );
    const publishingUserName = listResponse.publishingUserName ?? "";
    const publishingPassword = listResponse.publishingPassword ?? "";
    const encryptedCredentials: string = Base64.encode(
      `${publishingUserName}:${publishingPassword}`
    );

    return {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-cache",
        Authorization: `Basic ${encryptedCredentials}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: DeployConstant.DEPLOY_TIMEOUT_IN_MS,
    };
  }

  protected async restartFunctionApp(azureResource: AzureResourceInfo): Promise<void> {
    this.context.logProvider.debug("Restarting function app...");
    try {
      await this.managementClient?.webApps?.restart(
        azureResource.resourceGroupName,
        azureResource.instanceId
      );
    } catch (e) {
      this.logger.warning(getLocalizedString("driver.deploy.error.restartWebAppError"));
    }
  }
}

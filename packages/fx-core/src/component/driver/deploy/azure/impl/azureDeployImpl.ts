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
import { DeployExternalApiCallError, DeployTimeoutError } from "../../../../error/deployError";
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
import { progressBarHelper } from "./progressBarHelper";
import { wrapAzureOperation } from "../../../../utils/azureSdkErrorHandler";
import { getLocalizedString } from "../../../../../common/localizeUtils";

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
      this.progressNames = this.progressPrepare;
    }
    this.progressBar = this.createProgressBar(this.ui);
    this.progressHandler = progressBarHelper(this.progressNames, this.progressBar);
    await this.progressBar?.start();

    if (args.dryRun && this.prepare) {
      await this.prepare(inputs);
      await this.progressBar?.end(true);
      return false;
    }
    await this.azureDeploy(inputs, azureResource, azureCredential);
    await this.progressBar?.end(true);
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
  protected async checkDeployStatus(
    location: string,
    config: AzureUploadConfig,
    logger?: LogProvider
  ): Promise<DeployResult | undefined> {
    let res: AxiosDeployQueryResult;
    for (let i = 0; i < DeployConstant.DEPLOY_CHECK_RETRY_TIMES; ++i) {
      try {
        res = await AzureDeployImpl.AXIOS_INSTANCE.get(location, config);
      } catch (e) {
        if (axios.isAxiosError(e)) {
          await logger?.error(
            `Check deploy status failed with response status code: ${
              e.response?.status ?? "NA"
            }, message: ${JSON.stringify(e.response?.data)}`
          );
        }
        throw DeployExternalApiCallError.deployStatusError(e, undefined, this.helpLink);
      }

      if (res) {
        if (res?.status === HttpStatusCode.ACCEPTED) {
          await waitSeconds(DeployConstant.BACKOFF_TIME_S);
        } else if (res?.status === HttpStatusCode.OK || res?.status === HttpStatusCode.CREATED) {
          if (res.data?.status === DeployStatus.Failed) {
            await logger?.error(
              `Deployment is failed with error message: ${JSON.stringify(res.data)}`
            );
            throw DeployExternalApiCallError.deployRemoteStatusError(res);
          }
          return res.data;
        } else {
          if (res.status) {
            await logger?.error(`Deployment is failed with error code: ${res.status}.`);
          }
          throw DeployExternalApiCallError.deployStatusError(res, res.status, this.helpLink);
        }
      }
    }

    throw DeployTimeoutError.checkDeployStatusTimeout(this.helpLink);
  }

  /**
   * create azure deploy config for Azure Function and Azure App service
   * @param azureResource azure resource info
   * @param azureCredential user azure credential
   * @protected
   */
  protected async createAzureDeployConfig(
    azureResource: AzureResourceInfo,
    azureCredential: TokenCredential
  ): Promise<AzureUploadConfig> {
    const managementClient = (this.managementClient = new appService.WebSiteManagementClient(
      azureCredential,
      azureResource.subscriptionId
    ));
    const listResponse = await wrapAzureOperation(
      () =>
        managementClient.webApps.beginListPublishingCredentialsAndWait(
          azureResource.resourceGroupName,
          azureResource.instanceId
        ),
      (e) => DeployExternalApiCallError.listPublishingCredentialsRemoteError(e, this.helpLink),
      (e) => DeployExternalApiCallError.listPublishingCredentialsError(e, this.helpLink)
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
    await this.context.logProvider.debug("Restarting function app...");
    try {
      await this.managementClient?.webApps?.restart(
        azureResource.resourceGroupName,
        azureResource.instanceId
      );
    } catch (e) {
      this.logger?.warning(getLocalizedString("driver.deploy.error.restartWebAppError"));
    }
  }
}

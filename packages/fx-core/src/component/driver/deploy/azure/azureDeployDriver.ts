// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  DeployStepArgs,
  AzureUploadConfig,
  AxiosZipDeployResult,
  DeployArgs,
  AxiosDeployQueryResult,
  DeployResult,
} from "../../interface/buildAndDeployArgs";
import {
  DeployExternalApiCallError,
  DeployTimeoutError,
  DeployUserInputError,
} from "../../../error/deployError";
import { LogProvider } from "@microsoft/teamsfx-api";
import { BaseDeployDriver } from "./baseDeployDriver";
import { Base64 } from "js-base64";
import * as appService from "@azure/arm-appservice";
import { DeployConstant, DeployStatus } from "../../../constant/deployConstant";
import { default as axios } from "axios";
import { waitSeconds } from "../../../../common/tools";
import { HttpStatusCode } from "../../../constant/commonConstant";
import {
  getAzureAccountCredential,
  parseAzureResourceId,
} from "../../../utils/azureResourceOperation";
import { AzureResourceInfo } from "../../interface/commonArgs";
import { TokenCredential } from "@azure/identity";
import { ProgressMessages } from "../../../messages";
import * as fs from "fs-extra";
import { PrerequisiteError } from "../../../error/componentError";
import { createHash } from "crypto";

export abstract class AzureDeployDriver extends BaseDeployDriver {
  protected managementClient: appService.WebSiteManagementClient | undefined;

  public static readonly AXIOS_INSTANCE = axios.create();

  /**
   * the pattern that used to parse resource id and extract info from it
   */
  abstract pattern: RegExp;

  async deploy(args: DeployArgs): Promise<void> {
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
    const azureResource = args.resourceId ? this.parseResourceId(args.resourceId) : undefined;
    const azureCredential = args.resourceId
      ? await getAzureAccountCredential(this.context.azureAccountProvider)
      : undefined;

    return await this.azureDeploy({ ignoreFile: args.ignoreFile }, azureResource, azureCredential);
  }

  /**
   * real azure deploy logic
   * @param args local file needed to be deployed
   * @param azureResource azure resource info
   * @param azureCredential azure user login credential
   */
  abstract azureDeploy(
    args: DeployStepArgs,
    azureResource?: AzureResourceInfo,
    azureCredential?: TokenCredential
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
   * deploy to azure app service or azure function use zip deploy method
   * @param args local file needed to be deployed
   * @param azureResource azure resource info
   * @param azureCredential azure user login credential
   * @return the zip deploy time cost
   * @protected
   */
  public async zipDeploy(
    args: DeployStepArgs,
    azureResource?: AzureResourceInfo,
    azureCredential?: TokenCredential
  ): Promise<number> {
    await this.progressBar?.next(ProgressMessages.packingCode);
    const zipBuffer = await this.packageToZip(args, this.context);
    if (!azureResource || !azureCredential) {
      throw DeployUserInputError.deployPrepareComplete();
    }
    await this.progressBar?.next(ProgressMessages.getAzureAccountInfoForDeploy);
    await this.context.logProvider.debug("Start to get Azure account info for deploy");
    const config = await this.createAzureDeployConfig(azureResource, azureCredential);
    await this.context.logProvider.debug("Get Azure account info for deploy complete");
    await this.progressBar?.next(ProgressMessages.getAzureUploadEndpoint);
    const endpoint = this.getZipDeployEndpoint(azureResource.instanceId);
    await this.context.logProvider.debug(`Start to upload code to ${endpoint}`);
    await this.progressBar?.next(ProgressMessages.uploadZipFileToAzure);
    const startTime = Date.now();
    const location = await this.zipDeployPackage(
      endpoint,
      zipBuffer,
      config,
      this.context.logProvider
    );
    await this.context.logProvider.debug("Upload code to Azure complete");
    await this.progressBar?.next(ProgressMessages.checkAzureDeployStatus);
    await this.context.logProvider.debug("Start to check Azure deploy status");
    const deployRes = await this.checkDeployStatus(location, config, this.context.logProvider);
    await this.context.logProvider.debug("Check Azure deploy status complete");
    const cost = Date.now() - startTime;
    this.context.telemetryReporter?.sendTelemetryEvent("deployResponse", {
      time_cost: cost.toString(),
      status: deployRes?.status.toString() ?? "",
      message: deployRes?.message ?? "",
      received_time: deployRes?.received_time ?? "",
      started_time: deployRes?.start_time.toString() ?? "",
      end_time: deployRes?.end_time.toString() ?? "",
      last_success_end_time: deployRes?.last_success_end_time.toString() ?? "",
      complete: deployRes?.complete.toString() ?? "",
      active: deployRes?.active.toString() ?? "",
      is_readonly: deployRes?.is_readonly.toString() ?? "",
      site_name_hash: deployRes?.site_name
        ? createHash("sha256").update(deployRes.site_name).digest("hex")
        : "",
    });
    return cost;
  }

  /**
   * call azure app service or azure function zip deploy method
   * @param zipDeployEndpoint azure zip deploy endpoint
   * @param zipBuffer zip file buffer
   * @param config azure upload config, including azure account credential
   * @param logger log provider
   * @protected
   */
  protected async zipDeployPackage(
    zipDeployEndpoint: string,
    zipBuffer: Buffer,
    config: AzureUploadConfig,
    logger?: LogProvider
  ): Promise<string> {
    let res: AxiosZipDeployResult;
    let retryCount = 0;
    while (true) {
      try {
        res = await AzureDeployDriver.AXIOS_INSTANCE.post(zipDeployEndpoint, zipBuffer, config);
        break;
      } catch (e) {
        if (axios.isAxiosError(e)) {
          // if the error is remote server error, retry
          if ((e.response?.status ?? 200) >= 500) {
            retryCount += 1;
            if (retryCount < DeployConstant.DEPLOY_UPLOAD_RETRY_TIMES) {
              await logger?.warning(
                `Upload zip file failed with response status code: ${
                  e.response?.status ?? "NA"
                }. Retrying...`
              );
            } else {
              // if retry times exceed, throw error
              await logger?.warning(
                `Retry times exceeded. Upload zip file failed with remote server error. Message: ${JSON.stringify(
                  e.response?.data
                )}`
              );
              throw DeployExternalApiCallError.zipDeployWithRemoteError(
                e,
                undefined,
                this.helpLink
              );
            }
          } else {
            // None server error, throw
            await logger?.error(
              `Upload zip file failed with response status code: ${
                e.response?.status ?? "NA"
              }, message: ${JSON.stringify(e.response?.data)}`
            );
            throw DeployExternalApiCallError.zipDeployError(
              e,
              e.response?.status ?? -1,
              this.helpLink
            );
          }
        } else {
          // if the error is not axios error, throw
          await logger?.error(`Upload zip file failed with error: ${JSON.stringify(e)}`);
          throw DeployExternalApiCallError.zipDeployError(e, -1, this.helpLink);
        }
      }
    }

    if (res?.status !== HttpStatusCode.OK && res?.status !== HttpStatusCode.ACCEPTED) {
      if (res?.status) {
        await logger?.error(`Deployment is failed with error code: ${res.status}.`);
      }
      throw DeployExternalApiCallError.zipDeployError(res, res.status, this.helpLink);
    }

    return res.headers.location;
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
        res = await AzureDeployDriver.AXIOS_INSTANCE.get(location, config);
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
            throw DeployExternalApiCallError.deployRemoteStatusError();
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
   * create azure zip deploy endpoint
   * @param siteName azure app service or azure function name
   * @protected
   */
  protected getZipDeployEndpoint(siteName: string): string {
    return `https://${siteName}.scm.azurewebsites.net/api/zipdeploy?isAsync=true`;
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
    this.managementClient = new appService.WebSiteManagementClient(
      azureCredential,
      azureResource.subscriptionId
    );
    let listResponse;
    try {
      listResponse = await this.managementClient.webApps.beginListPublishingCredentialsAndWait(
        azureResource.resourceGroupName,
        azureResource.instanceId
      );
    } catch (e) {
      throw DeployExternalApiCallError.listPublishingCredentialsError(e, this.helpLink);
    }

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
      throw DeployExternalApiCallError.restartWebAppError(e, this.helpLink);
    }
  }
}

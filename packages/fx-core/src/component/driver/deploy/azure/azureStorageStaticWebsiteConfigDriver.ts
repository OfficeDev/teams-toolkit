// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ExecutionResult, StepDriver } from "../../interface/stepDriver";
import { AzureResourceInfo, DriverContext } from "../../interface/commonArgs";
import { Service } from "typedi";
import { asFactory, asOptional, asString, wrapRun, wrapSummary } from "../../../utils/common";
import { AzureStorageStaticWebsiteConfigArgs } from "../../interface/provisionArgs";
import {
  createBlobServiceClient,
  getAzureAccountCredential,
  parseAzureResourceId,
} from "../../../utils/azureResourceOperation";
import { BlobServiceClient, BlobServiceProperties } from "@azure/storage-blob";
import { FxError, IProgressHandler, Result } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../../constant/commonConstant";
import { DeployConstant } from "../../../constant/deployConstant";
import { ProgressMessages } from "../../../messages";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { wrapAzureOperation } from "../../../utils/azureSdkErrorHandler";
import { DeployExternalApiCallError } from "../../../error/deployError";

const ACTION_NAME = "azureStorage/enableStaticWebsite";

/**
 * enable static website for azure storage account
 */
@Service(ACTION_NAME)
export class AzureStorageStaticWebsiteConfigDriver implements StepDriver {
  readonly description: string = getLocalizedString(
    // eslint-disable-next-line no-secrets/no-secrets
    "driver.deploy.enableStaticWebsiteInAzureStorageDescription"
  );
  protected static readonly HELP_LINK =
    "https://aka.ms/teamsfx-actions/azure-storage-enable-static-website";
  protected static readonly STORAGE_CONFIG_ARGS = asFactory<AzureStorageStaticWebsiteConfigArgs>({
    storageResourceId: asString,
    indexPage: asOptional(asString),
    errorPage: asOptional(asString),
  });
  protected static readonly RETURN_VALUE = new Map<string, string>();
  protected static readonly RESOURCE_PATTERN =
    /\/subscriptions\/([^\/]*)\/resourceGroups\/([^\/]*)\/providers\/Microsoft.Storage\/storageAccounts\/([^\/]*)/i;

  @hooks([addStartAndEndTelemetry(ACTION_NAME, TelemetryConstant.PROVISION_COMPONENT_NAME)])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    const progressBar = await context.ui?.createProgressBar(
      ProgressMessages.configureAzureStorageEnableStaticWebsite,
      2
    );
    return wrapRun(
      () => this.config(args, context, progressBar),
      AzureStorageStaticWebsiteConfigDriver.cleanup.bind(progressBar),
      context.logProvider
    );
  }

  execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    return wrapSummary(this.run.bind(this, args, ctx), [
      "driver.deploy.enableStaticWebsiteSummary",
    ]);
  }

  /**
   * enable static website for azure storage account
   * @param args Azure Storage resourceId, index page and error page
   * @param context log provider, progress handler, telemetry reporter
   * @param progressBar progress handler
   */
  async config(
    args: unknown,
    context: DriverContext,
    progressBar?: IProgressHandler
  ): Promise<Map<string, string>> {
    const logger = context.logProvider;
    await progressBar?.start();
    await progressBar?.next(ProgressMessages.checkAzureStorageEnableStaticWebsite);
    const input = AzureStorageStaticWebsiteConfigDriver.STORAGE_CONFIG_ARGS(
      args,
      AzureStorageStaticWebsiteConfigDriver.HELP_LINK
    );
    await logger.debug(
      `Enabling static website feature for Azure Storage account ${input.storageResourceId}`
    );
    const azureInfo = parseAzureResourceId(
      input.storageResourceId,
      AzureStorageStaticWebsiteConfigDriver.RESOURCE_PATTERN
    );
    const azureTokenCredential = await getAzureAccountCredential(context.azureAccountProvider);
    const azureBlobClient = await createBlobServiceClient(azureInfo, azureTokenCredential);

    if (await this.isStorageStatusWebsiteEnabled(azureInfo, azureBlobClient, context)) {
      await logger.debug(
        `Static website feature is already enabled for Azure Storage account ${input.storageResourceId}.`
      );
      await progressBar?.next(ProgressMessages.azureStorageStaticWebsiteAlreadyEnabled);
      await progressBar?.end(true);
      return AzureStorageStaticWebsiteConfigDriver.RETURN_VALUE;
    }

    await progressBar?.next(ProgressMessages.enableAzureStorageStaticWebsite);
    const properties = {
      staticWebsite: {
        indexDocument: input.indexPage ?? DeployConstant.DEFAULT_INDEX_DOCUMENT,
        errorDocument404Path: input.errorPage ?? DeployConstant.DEFAULT_ERROR_DOCUMENT,
        enabled: true,
      },
    } as BlobServiceProperties;

    await wrapAzureOperation(
      () => azureBlobClient.setProperties(properties),
      (e) => DeployExternalApiCallError.enableContainerStaticWebsiteRemoteError(e),
      (e) => DeployExternalApiCallError.enableContainerStaticWebsiteError(e)
    );
    await progressBar?.end(true);
    return Promise.resolve(AzureStorageStaticWebsiteConfigDriver.RETURN_VALUE);
  }

  async isStorageStatusWebsiteEnabled(
    azureInfo: AzureResourceInfo,
    azureBlobClient: BlobServiceClient,
    context: DriverContext
  ): Promise<boolean> {
    await context.logProvider.debug(
      `Checking if static website feature is enabled in Azure Storage account '${azureInfo.instanceId}'.`
    );
    return await wrapAzureOperation(
      async () => (await azureBlobClient.getProperties()).staticWebsite?.enabled === true,
      (e) => DeployExternalApiCallError.checkContainerStaticWebsiteRemoteError(e),
      (e) => DeployExternalApiCallError.checkContainerStaticWebsiteError(e)
    );
  }

  /**
   * call when error happens
   * do some resource clean up
   */
  static async cleanup(progressBar?: IProgressHandler): Promise<void> {
    await progressBar?.end(false);
  }
}

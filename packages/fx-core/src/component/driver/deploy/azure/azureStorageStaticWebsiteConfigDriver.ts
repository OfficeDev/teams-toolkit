// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { StepDriver } from "../../interface/stepDriver";
import { AzureResourceInfo, DriverContext } from "../../interface/commonArgs";
import { Service } from "typedi";
import { asFactory, asOptional, asString, wrapRun } from "../../../utils/common";
import { AzureStorageStaticWebsiteConfigArgs } from "../../interface/provisionArgs";
import {
  createBlobServiceClient,
  getAzureAccountCredential,
  parseAzureResourceId,
} from "../../../utils/azureResourceOperation";
import { BlobServiceClient, BlobServiceProperties } from "@azure/storage-blob";
import { FxError, Result } from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks";
import { addStartAndEndTelemetry } from "../../middleware/addStartAndEndTelemetry";
import { TelemetryConstant } from "../../../constant/commonConstant";
import { DeployConstant } from "../../../constant/deployConstant";

const ACTION_NAME = "azureStorage/enableStaticWebsite";

/**
 * enable static website for azure storage account
 */
@Service(ACTION_NAME)
export class AzureStorageStaticWebsiteConfigDriver implements StepDriver {
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
    return wrapRun(() => this.config(args, context));
  }

  /**
   * enable static website for azure storage account
   * @param args Azure Storage resourceId, index page and error page
   * @param context log provider, progress handler, telemetry reporter
   */
  async config(args: unknown, context: DriverContext): Promise<Map<string, string>> {
    const logger = context.logProvider;
    const input = AzureStorageStaticWebsiteConfigDriver.STORAGE_CONFIG_ARGS(args);
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
      return AzureStorageStaticWebsiteConfigDriver.RETURN_VALUE;
    }

    const properties = {
      staticWebsite: {
        indexDocument: input.indexPage ?? DeployConstant.DEFAULT_INDEX_DOCUMENT,
        errorDocument404Path: input.errorPage ?? DeployConstant.DEFAULT_ERROR_DOCUMENT,
        enabled: true,
      },
    } as BlobServiceProperties;

    await azureBlobClient.setProperties(properties);
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
    return (await azureBlobClient.getProperties()).staticWebsite?.enabled === true;
  }
}

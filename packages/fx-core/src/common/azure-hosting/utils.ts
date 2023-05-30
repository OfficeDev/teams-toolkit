// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler, TokenProvider } from "@microsoft/teamsfx-api";
import { TokenCredential } from "@azure/core-auth";
import * as appService from "@azure/arm-appservice";
import { AzureUploadConfig, Logger } from "./interfaces";
import { Base64 } from "js-base64";
import { AzureOperations } from "./azureOps";
import { AzureOperationCommonConstants, AzureOpsConstant } from "./hostingConstant";
import { PreconditionError } from "./hostingError";
import {
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../tools";
import { Messages } from "./messages";

async function getAzureAccountCredential(tokenProvider: TokenProvider): Promise<TokenCredential> {
  const credential = await tokenProvider.azureAccountProvider.getIdentityCredentialAsync();
  if (!credential) {
    throw new PreconditionError(AzureOpsConstant.FAIL_TO_GET_AZURE_CREDENTIALS(), [
      AzureOpsConstant.TRY_LOGIN_AZURE(),
    ]);
  }
  return credential;
}

async function fetchWebSiteManagementClient(
  subscriptionId: string,
  tokenProvider: TokenProvider
): Promise<appService.WebSiteManagementClient> {
  return new appService.WebSiteManagementClient(
    await getAzureAccountCredential(tokenProvider),
    subscriptionId
  );
}

async function getAzureDeployConfig(
  subscriptionId: string,
  rgName: string,
  siteName: string,
  tokenProvider: TokenProvider
): Promise<[AzureUploadConfig, appService.WebSiteManagementClient]> {
  // get publish credentials
  const webSiteMgmtClient = await fetchWebSiteManagementClient(subscriptionId, tokenProvider);
  const listResponse = await AzureOperations.listPublishingCredentials(
    webSiteMgmtClient,
    rgName,
    siteName
  );
  const publishingUserName = listResponse.publishingUserName ?? "";
  const publishingPassword = listResponse.publishingPassword ?? "";
  const encryptedCredentials: string = Base64.encode(`${publishingUserName}:${publishingPassword}`);
  return [
    {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-cache",
        Authorization: `Basic ${encryptedCredentials}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: AzureOperationCommonConstants.deployTimeoutInMs,
    },
    webSiteMgmtClient,
  ];
}

export async function azureWebSiteDeploy(
  resourceId: string,
  tokenProvider: TokenProvider,
  buffer: Buffer,
  logger?: Logger,
  progress?: IProgressHandler
): Promise<appService.WebSiteManagementClient> {
  const subscriptionId = getSubscriptionIdFromResourceId(resourceId);
  const rgName = getResourceGroupNameFromResourceId(resourceId);
  const siteName = getSiteNameFromResourceId(resourceId);
  const [config, client] = await getAzureDeployConfig(
    subscriptionId,
    rgName,
    siteName,
    tokenProvider
  );
  const zipDeployEndpoint: string = getZipDeployEndpoint(siteName);
  await progress?.next(Messages.zipDeploy);
  const statusUrl = await AzureOperations.zipDeployPackage(zipDeployEndpoint, buffer, config);
  await AzureOperations.checkDeployStatus(statusUrl, config);

  logger?.info?.(Messages.deploy(zipDeployEndpoint, buffer.byteLength));
  return client;
}

function getZipDeployEndpoint(siteName: string): string {
  return `https://${siteName}.scm.azurewebsites.net/api/zipdeploy?isAsync=true`;
}

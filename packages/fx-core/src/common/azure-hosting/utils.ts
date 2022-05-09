// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ArmTemplateResult } from "../armInterface";
import { Inputs, TokenProvider } from "@microsoft/teamsfx-api";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import * as appService from "@azure/arm-appservice";
import { AzureUploadConfig } from "./interfaces";
import { Base64 } from "js-base64";
import { AzureOperations } from "./azureOps";
import { AzureOperationCommonConstants, AzureOpsConstant } from "./hostingConstant";
import { PreconditionError } from "./hostingError";

export function mergeTemplates(templates: ArmTemplateResult[]): ArmTemplateResult {
  const existsProvision = templates.some((it) => it.Provision);
  const existsParameters = templates.some((it) => it.Parameters);
  return {
    Provision: existsProvision
      ? {
          Orchestration: templates.map((template) => template.Provision?.Orchestration).join(""),
          Modules: templates
            .map((template) => template.Provision?.Modules)
            .reduce((result, current) => Object.assign(result, current), {}),
        }
      : undefined,
    Configuration: {
      Orchestration: templates.map((template) => template.Configuration?.Orchestration).join(""),
      Modules: templates
        .map((template) => template.Configuration?.Modules)
        .reduce((result, current) => Object.assign(result, current), {}),
    },
    Parameters: existsParameters
      ? Object.assign({}, ...templates.map((template) => template.Parameters))
      : undefined,
    Reference: Object.assign({}, ...templates.map((template) => template.Reference)),
  };
}

async function getAzureAccountCredential(
  tokenProvider: TokenProvider
): Promise<TokenCredentialsBase> {
  const credential = await tokenProvider.azureAccountProvider.getAccountCredentialAsync();
  if (!credential) {
    throw new PreconditionError(AzureOpsConstant.FAIL_TO_GET_AZURE_CREDENTIALS, [
      AzureOpsConstant.TRY_LOGIN_AZURE,
    ]);
  }
  return credential;
}

async function fetchWebSiteManagementClient(
  tokenProvider: TokenProvider,
  inputs: Inputs
): Promise<appService.WebSiteManagementClient> {
  return new appService.WebSiteManagementClient(
    await getAzureAccountCredential(tokenProvider),
    inputs.subscriptionId
  );
}

async function getAzureDeployConfig(
  tokenProvider: TokenProvider,
  inputs: Inputs,
  siteName: string
): Promise<[AzureUploadConfig, appService.WebSiteManagementClient]> {
  // get publish credentials
  const webSiteMgmtClient = await fetchWebSiteManagementClient(tokenProvider, inputs);
  const listResponse = await AzureOperations.listPublishingCredentials(
    webSiteMgmtClient,
    inputs.resourceGroupName,
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
  inputs: Inputs,
  tokenProvider: TokenProvider,
  buffer: Buffer,
  siteName: string
): Promise<appService.WebSiteManagementClient> {
  const [config, client] = await getAzureDeployConfig(tokenProvider, inputs, siteName);
  const zipDeployEndpoint: string = getZipDeployEndpoint(siteName);
  const statusUrl = await AzureOperations.zipDeployPackage(zipDeployEndpoint, buffer, config);
  await AzureOperations.checkDeployStatus(statusUrl, config);
  return client;
}

function getZipDeployEndpoint(siteName: string): string {
  return `https://${siteName}.scm.azurewebsites.net/api/zipdeploy?isAsync=true`;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

export const signedIn = "SignedIn";
export const signedOut = "SignedOut";

export const env = {
  name: "AzureCloud",
  portalUrl: "https://portal.azure.com",
  publishingProfileUrl: "https://go.microsoft.com/fwlink/?LinkId=254432",
  managementEndpointUrl: "https://management.core.windows.net",
  resourceManagerEndpointUrl: "https://management.azure.com/",
  sqlManagementEndpointUrl: "https://management.core.windows.net:8443/",
  sqlServerHostnameSuffix: ".database.windows.net",
  galleryEndpointUrl: "https://gallery.azure.com/",
  activeDirectoryEndpointUrl: "https://login.microsoftonline.com/",
  activeDirectoryResourceId: "https://management.core.windows.net/",
  activeDirectoryGraphResourceId: "https://graph.windows.net/",
  batchResourceId: "https://batch.core.windows.net/",
  activeDirectoryGraphApiVersion: "2013-04-05",
  storageEndpointSuffix: "core.windows.net",
  keyVaultDnsSuffix: ".vault.azure.net",
  azureDataLakeStoreFileSystemEndpointSuffix: "azuredatalakestore.net",
  azureDataLakeAnalyticsCatalogAndJobEndpointSuffix: "azuredatalakeanalytics.net",
  validateAuthority: true,
};

export const unknownSubscription = "UnknownSubscription";
export const unknownSubscriptionDesc = "Cannot set subscription. Choose a correct subscription.";

export const azureLoginMessage =
  "Log in to your Azure account - opening default web browser at https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize.";
export const m365LoginMessage =
  "Log in to your M365 account - opening default web browser at https://login.microsoftonline.com/common/oauth2/v2.0/authorize.";

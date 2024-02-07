// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export type AzureStorageStaticWebsiteConfigArgs = {
  storageResourceId: string;
  indexPage?: string;
  errorPage?: string;
};

export type AzureStaticWebAppConfigArgs = {
  resourceId: string;
};

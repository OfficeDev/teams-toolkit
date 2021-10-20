// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as appService from "@azure/arm-appservice";
import * as msRest from "@azure/ms-rest-js";

export function createWebSiteMgmtClient(
  creds: msRest.ServiceClientCredentials,
  subs: string
): appService.WebSiteManagementClient {
  return new appService.WebSiteManagementClient(creds, subs);
}

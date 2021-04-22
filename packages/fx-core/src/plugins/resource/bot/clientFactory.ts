// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as appService from "@azure/arm-appservice";
import * as msRest from "@azure/ms-rest-js";
import { AzureBotService } from "@azure/arm-botservice";
import { ClientCreationError } from "./errors";
import { ClientNames } from "./resources/strings";

export function createAzureBotServiceClient(creds: msRest.ServiceClientCredentials, subs: string): AzureBotService {
    try {
        return new AzureBotService(creds, subs);
    } catch (e) {
        throw new ClientCreationError(ClientNames.BOT_SERVICE_CLIENT, e);
    }
}

export function createWebSiteMgmtClient(
    creds: msRest.ServiceClientCredentials,
    subs: string,
): appService.WebSiteManagementClient {
    try {
        return new appService.WebSiteManagementClient(creds, subs);
    } catch (e) {
        throw new ClientCreationError(ClientNames.WEB_SITE_MGMT_CLIENT, e);
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { UserType } from "./utils/commonUtils";

export class SqlConfig {
    azureSubscriptionId = "";
    resourceGroup = "";
    location = "";
    resourceNameSuffix = "";
    sqlServer = "";
    sqlEndpoint = "";
    admin = "";
    adminPassword = "";
    databaseName = "";
    aadAdmin = "";
    aadAdminObjectId = "";
    aadAdminType: UserType = UserType.User;
    tenantId = "";
    identity = "";
    existSql = false;
    skipAddingUser = false;
}

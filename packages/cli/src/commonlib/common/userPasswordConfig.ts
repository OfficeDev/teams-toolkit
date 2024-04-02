// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import dotenv from "dotenv";

dotenv.config();

export const client_id = "415830ba-8ddd-4fac-8b24-f5c150a3a59e";

export const AZURE_ACCOUNT_NAME = process.env.AZURE_ACCOUNT_NAME;
export const AZURE_ACCOUNT_OBJECT_ID = process.env.AZURE_ACCOUNT_OBJECT_ID;
export const AZURE_ACCOUNT_PASSWORD = process.env.AZURE_ACCOUNT_PASSWORD;
export const AZURE_SUBSCRIPTION_ID = process.env.AZURE_SUBSCRIPTION_ID;
export const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
export const M365_ACCOUNT_NAME = process.env.M365_ACCOUNT_NAME;
export const M365_ACCOUNT_PASSWORD = process.env.M365_ACCOUNT_PASSWORD;
export const M365_TENANT_ID = process.env.M365_TENANT_ID;
